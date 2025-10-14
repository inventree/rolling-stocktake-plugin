"""API serializers for the RollingStocktake plugin."""

from rest_framework import serializers

from stock.serializers import StockItemSerializer


class RollingStocktakeSerializer(serializers.Serializer):
    """Serializer for the RollingStocktake plugin.

    This simply returns the next item to be counted by the user.
    """

    class Meta:
        """Meta options for this serializer."""

        fields = [
            "item",
        ]

    item = StockItemSerializer(
        many=False,
        read_only=True,
        allow_null=True,
    )
