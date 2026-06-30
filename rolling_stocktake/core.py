"""Support rolling stocktake for InvenTree"""

from datetime import timedelta
import random
import structlog

from django.db.models import DateField, Min, Q
from django.db.models.functions import Cast, Coalesce
from django.core.validators import MinValueValidator

from plugin import InvenTreePlugin

from plugin.mixins import (
    EventMixin,
    ScheduleMixin,
    SettingsMixin,
    UrlsMixin,
    UserInterfaceMixin,
)

from InvenTree.api_version import INVENTREE_API_VERSION

from . import PLUGIN_VERSION


class RollingStocktake(
    EventMixin,
    ScheduleMixin,
    SettingsMixin,
    UrlsMixin,
    UserInterfaceMixin,
    InvenTreePlugin,
):
    """RollingStocktake - InvenTree plugin for rolling stocktake functionality."""

    # Plugin metadata
    TITLE = "Rolling Stocktake"
    NAME = "RollingStocktake"
    SLUG = "rolling-stocktake"
    DESCRIPTION = "Support rolling stocktake for InvenTree"
    VERSION = PLUGIN_VERSION

    # Additional project information
    AUTHOR = "Oliver Walters"
    WEBSITE = "https://github.com/inventree/rolling-stocktake-plugin"
    LICENSE = "MIT"

    # Optionally specify supported InvenTree versions
    MIN_VERSION = "1.1.0"
    MAX_VERSION = "2.0.0"

    COUNTED_EVENT = "stockitem.counted"

    # Scheduled tasks (from ScheduleMixin)
    # Ref: https://docs.inventree.org/en/latest/plugins/mixins/schedule/
    SCHEDULED_TASKS = {
        "check_stale_items": {
            "func": "check_stale_items",
            "schedule": "D",
        },
        "check_non_stale_items": {
            "func": "check_non_stale_items",
            "schedule": "D",
        },
    }

    # Plugin settings (from SettingsMixin)
    SETTINGS = {
        "USER_GROUP": {
            "name": "Allowed Group",
            "description": "The user group required to participate in perform rolling stocktake",
            "model": "auth.group",
        },
        "WEEKLY_LIMIT": {
            "name": "Weekly Limit",
            "description": "The maximum number of stock items to be counted by a user in a single week",
            "default": 5,
            "validator": [
                int,
                MinValueValidator(1),
            ],
        },
        "RANDOM_POOL_SIZE": {
            "name": "Random Pool",
            "description": "The size of the pool of items to select from when randomizing the order of items to be counted (0 to disable randomization)",
            "default": 5,
            "validator": [
                int,
                MinValueValidator(0),
            ],
        },
        "IGNORE_EXTERNAL": {
            "name": "Ignore External Locations",
            "description": "Ignore stock items which are located in external locations",
            "default": True,
            "validator": bool,
        },
        "IGNORE_INACTIVE": {
            "name": "Ignore Inactive Parts",
            "description": "Ignore stock items which belong to inactive parts",
            "default": True,
            "validator": bool,
        },
        "DISPLAY_CREATURE": {
            "name": "Display Creature",
            "description": "Display a creature on the dashboard item when there are items to be counted",
            "default": False,
            "validator": bool,
        },
        "STALE_PERIOD": {
            "name": "Stale Period",
            "description": "The number of days after which a stock item requires counting",
            "default": 365,
            "units": "days",
            "validator": [
                int,
                MinValueValidator(30),
            ],
        },
        "STALE_STATUS": {
            "name": "Stale Status",
            "description": "The stock status which indicates that a stock item is stale and requires counting",
            "validator": [
                int,
                MinValueValidator(1),
            ],
        },
    }

    # --- Shared helpers ---

    def _get_stale_config(self):
        """Return (stale_status, threshold) or (None, None) if the feature is not configured."""
        from InvenTree.helpers import current_date

        try:
            stale_status = int(self.get_setting("STALE_STATUS"))
        except Exception:
            return None, None

        if not stale_status or stale_status <= 0:
            return None, None

        stale_period = max(30, int(self.get_setting("STALE_PERIOD", backup_value=365)))
        threshold = current_date() - timedelta(days=stale_period)
        return stale_status, threshold

    def _apply_common_filters(self, items):
        """Apply virtual-part / inactive-part / external-location exclusions to a StockItem queryset."""
        items = items.exclude(part__virtual=True)

        if self.get_setting("IGNORE_INACTIVE"):
            items = items.filter(part__active=True)

        if self.get_setting("IGNORE_EXTERNAL", backup_value=True):
            items = items.exclude(location__external=True)

        return items

    # --- Scheduled tasks ---

    def check_stale_items(self):
        """Daily task: mark in-stock items as stale when they haven't been counted within the stale period."""

        from stock.models import StockItem

        logger = structlog.get_logger("inventree")

        stale_status, threshold = self._get_stale_config()
        if stale_status is None:
            return

        items = StockItem.objects.filter(StockItem.IN_STOCK_FILTER)
        items = self._apply_common_filters(items)

        # Ensure items are not consumed or otherwise unavailable
        items = items.filter(quantity__gt=0)
        items = items.filter(customer__isnull=True)
        items = items.filter(belongs_to__isnull=True)
        items = items.filter(consumed_by__isnull=True)

        # Exclude items which are already marked as stale
        items = items.exclude(status=stale_status)
        items = items.exclude(status_custom_key=stale_status)

        # Stale: created before threshold AND not counted since threshold
        stale_items = (
            items.filter(
                Q(creation_date__isnull=True) | Q(creation_date__date__lt=threshold)
            )
            .filter(Q(stocktake_date__isnull=True) | Q(stocktake_date__lt=threshold))
            .distinct()
        )

        for item in stale_items:
            item.set_status(stale_status)
            item.save()

        logger.info(
            f"Marked {stale_items.count()} stock items as stale (status={stale_status})"
        )

    def check_non_stale_items(self):
        """Daily task: reset status for stock items which are marked as stale but no longer meet the stale criteria."""

        from stock.models import StockItem

        logger = structlog.get_logger("inventree")

        stale_status, threshold = self._get_stale_config()
        if stale_status is None:
            return

        # Find in-stock items that are currently marked as stale
        items = StockItem.objects.filter(StockItem.IN_STOCK_FILTER)
        items = items.filter(Q(status=stale_status) | Q(status_custom_key=stale_status))

        # Of those, select items which are NOT actually stale:
        # created after the threshold, OR counted after the threshold
        non_stale_items = items.filter(
            Q(creation_date__date__gte=threshold) | Q(stocktake_date__gte=threshold)
        )

        count = non_stale_items.count()

        for item in non_stale_items:
            item.set_status(10)  # StockStatus.OK
            item.save()

        logger.info(
            f"Reset {count} stock items to OK status (no longer stale, status={stale_status})"
        )

    # --- Event handling ---

    # Ref: https://docs.inventree.org/en/latest/plugins/mixins/event/
    def wants_process_event(self, event: str) -> bool:
        """Return True if the plugin wants to process the given event."""
        return event == self.COUNTED_EVENT

    def process_event(self, event: str, **kwargs) -> None:
        """Process the provided event."""
        if event == self.COUNTED_EVENT:
            if id := kwargs.get("id"):
                self.on_item_saved(id)

    def on_item_saved(self, item_id) -> None:
        """If a just-counted item carries the stale status but is no longer stale, reset it to OK."""
        from stock.models import StockItem
        from stock.status_codes import StockStatus

        logger = structlog.get_logger("inventree")

        stale_status, threshold = self._get_stale_config()

        if stale_status is None:
            return

        try:
            item = StockItem.objects.filter(StockItem.IN_STOCK_FILTER).get(pk=item_id)
        except StockItem.DoesNotExist:
            return

        # Only act if the item is currently marked as stale
        if item.status != stale_status and item.status_custom_key != stale_status:
            return

        # Item is no longer stale if it was recently created or has just been counted
        recently_created = item.creation_date and item.creation_date.date() >= threshold
        recently_counted = item.stocktake_date and item.stocktake_date >= threshold

        if recently_created or recently_counted:
            item.set_status(StockStatus.OK)
            item.save()
            logger.info(
                f"Reset stock item {item_id} to OK status (counted, no longer stale)"
            )

    # --- Stock selection ---

    def get_stocktake_count_for_user(self, user):
        """Return the number of stock items which have been counted by the given user within the current week."""

        from InvenTree.helpers import current_date
        from stock.models import StockItem

        if not user:
            return 0

        return StockItem.objects.filter(
            stocktake_date__week=current_date().isocalendar()[1],
            stocktake_user=user,
        ).count()

    def get_oldest_stock_item(self, user):
        """Return the 'oldest' StockItem which should be counted next by the given user."""

        from stock.models import StockItem

        # First, check if the user has already counted the maximum number of items this week
        weekly_limit = int(self.get_setting("WEEKLY_LIMIT", backup_value=5))

        if weekly_limit > 0 and self.get_stocktake_count_for_user(user) >= weekly_limit:
            # Already reached the weekly limit
            return None

        items = StockItem.objects.filter(StockItem.IN_STOCK_FILTER)
        items = self._apply_common_filters(items)

        # TODO: Filter items based on user subscriptions

        if INVENTREE_API_VERSION < 496:
            # Annotate the "creation_date" value, based on the oldest StockItemHistory entry
            # This is a workaround for older InvenTree versions which do not have a "creation_date" field on the StockItem model
            items = items.annotate(
                creation_date=Cast(Min("tracking_info__date"), output_field=DateField())
            )

        # For items which do not have a "stocktake" date, annotate the "creation" date

        items = items.annotate(
            oldest_date=Coalesce(
                "stocktake_date", Min("tracking_info__date"), output_field=DateField()
            )
        )

        items = items.order_by("oldest_date")

        if items.count() == 0:
            return None

        pool_size = self.get_setting("RANDOM_POOL_SIZE")

        # No randomness - always return the oldest item
        if pool_size == 0:
            return items.first()

        items = list(items[:pool_size])

        return random.choice(items) if items else None

    # Custom URL endpoints (from UrlsMixin)
    # Ref: https://docs.inventree.org/en/latest/plugins/mixins/urls/
    def setup_urls(self):
        """Configure custom URL endpoints for this plugin."""
        from django.urls import path
        from .views import RollingStocktakeView

        return [
            # Provide path to a simple custom view - replace this with your own views
            path(
                "next/",
                RollingStocktakeView.as_view(),
                name="api-rolling-stocktake-view",
            ),
        ]

    # Custom dashboard items
    def get_ui_dashboard_items(self, request, context: dict, **kwargs):
        """Return a list of custom dashboard items to be rendered in the InvenTree user interface."""

        # Example: only display for 'staff' users
        if not request.user or not request.user.is_staff:
            return []

        items = []

        items.append({
            "key": "rolling-stocktake-dashboard",
            "title": "Rolling Stocktake",
            "description": "Display a stock item which needs to be counted next",
            "icon": "ti:dashboard:outline",
            "source": self.plugin_static_file(
                "Dashboard.js:renderRollingStocktakeDashboardItem"
            ),
            "context": {
                "settings": self.get_settings_dict(),
            },
            "options": {
                "width": 4,
                "height": 3,
            },
        })

        return items
