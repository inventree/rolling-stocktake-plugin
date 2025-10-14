"""Support rolling stocktake for InvenTree"""

from plugin import InvenTreePlugin

from plugin.mixins import (
    EventMixin,
    ScheduleMixin,
    SettingsMixin,
    UrlsMixin,
    UserInterfaceMixin,
)

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

    # Scheduled tasks (from ScheduleMixin)
    # Ref: https://docs.inventree.org/en/latest/plugins/mixins/schedule/
    SCHEDULED_TASKS = {
        # Define your scheduled tasks here...
    }

    # Plugin settings (from SettingsMixin)
    SETTINGS = {
        "USER_GROUP": {
            "name": "Allowed Group",
            "description": "The user group required to participate in perform rolling stocktake",
            "model": "auth.group",
        },
        "IGNORE_EXTERNAL": {
            "name": "Ignore External Locations",
            "description": "Ignore stock items which are located in external locations",
            "default": True,
            "validator": bool,
        },
    }

    def get_oldest_stock_item(self, user):
        """Return the 'oldest' StockItem which should be counted next by the given user."""

        from stock.models import StockItem

        # Start with a list of "in stock" items
        items = StockItem.objects.filter(StockItem.IN_STOCK_FILTER)

        # Exclude items which are linked to inactive or virtual parts
        items = items.filter(part__active=True).exclude(part__virtual=True)

        # Optionally filter out items in external locations
        if self.get_setting("IGNORE_EXTERNAL", backup_value=True):
            items = items.exclude(location__external=True)

        # TODO: Filter items based on user subscriptions

        # TODO: For items which do not have a "stocktake" date, annotate the "creation" date

        # TODO: Randomize the order of items which have the same stocktake date

        items = items.order_by("stocktake_date")

        return items.first()

    # Respond to InvenTree events (from EventMixin)
    # Ref: https://docs.inventree.org/en/latest/plugins/mixins/event/
    def wants_process_event(self, event: str) -> bool:
        """Return True if the plugin wants to process the given event."""
        # Example: only process the 'create part' event
        return event == "part_part.created"

    def process_event(self, event: str, *args, **kwargs) -> None:
        """Process the provided event."""
        print("Processing custom event:", event)
        print("Arguments:", args)
        print("Keyword arguments:", kwargs)

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
            "title": "Rolling Stocktake Dashboard Item",
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
