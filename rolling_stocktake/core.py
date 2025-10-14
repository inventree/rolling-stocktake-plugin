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
    MIN_VERSION = "1.0.0"
    MAX_VERSION = "2.0.0"

    # Scheduled tasks (from ScheduleMixin)
    # Ref: https://docs.inventree.org/en/latest/plugins/mixins/schedule/
    SCHEDULED_TASKS = {
        # Define your scheduled tasks here...
    }

    # Plugin settings (from SettingsMixin)
    # Ref: https://docs.inventree.org/en/latest/plugins/mixins/settings/
    SETTINGS = {
        # Define your plugin settings here...
        "CUSTOM_VALUE": {
            "name": "Custom Value",
            "description": "A custom value",
            "validator": int,
            "default": 42,
        }
    }

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
            "description": "Custom dashboard item",
            "icon": "ti:dashboard:outline",
            "source": self.plugin_static_file(
                "Dashboard.js:renderRollingStocktakeDashboardItem"
            ),
            "context": {
                # Provide additional context data to the dashboard item
                "settings": self.get_settings_dict(),
                "bar": "foo",
            },
        })

        return items
