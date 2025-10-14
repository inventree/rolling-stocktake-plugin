"""API views for the RollingStocktake plugin.

In practice, you would define your custom views here.

Ref: https://www.django-rest-framework.org/api-guide/views/
"""

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RollingStocktakeSerializer


class RollingStocktakeView(APIView):
    """API view for the RollingStocktake plugin.

    This view returns the next item to be counted by the user.
    The item is selected based on:

    - Items which have not been counted for the longest time
    - Items which are in stock
    - Items which belong to parts which are active or virtual
    - Items which belong to parts to which the user is subscribed (if any)

    """

    # You can control which users can access this view using DRF permissions
    permission_classes = [permissions.IsAuthenticated]

    # Control how the response is formatted
    serializer_class = RollingStocktakeSerializer

    def get(self, request, *args, **kwargs):
        """Override the GET method to return example data."""

        from plugin import registry

        rolling_stocktake_plugin = registry.get_plugin("rolling-stocktake")

        stock_item = rolling_stocktake_plugin.get_oldest_stock_item(request.user)

        response_serializer = self.serializer_class(
            instance={
                "item": stock_item,
            }
        )

        return Response(response_serializer.data, status=200)
