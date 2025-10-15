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
            "stocktake_date",
            "creation_date",
        ]

    item = StockItemSerializer(
        many=False,
        read_only=True,
        allow_null=True,
    )

    stocktake_date = serializers.DateField(
        source="item.stocktake_date", read_only=True, allow_null=True
    )

    creation_date = serializers.DateField(
        source="item.creation_date", read_only=True, allow_null=True
    )
