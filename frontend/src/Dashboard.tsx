// Import for type checking
import {
  checkPluginVersion,
  getDetailUrl,
  type InvenTreePluginContext,
  ModelType
} from '@inventreedb/ui';
import {
  ActionIcon,
  Alert,
  Button,
  Divider,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title
} from '@mantine/core';
import {
  IconClipboardCheck,
  IconEye,
  IconRefresh,
  IconTrash
} from '@tabler/icons-react';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

const queryClient = new QueryClient();

const NEXT_ITEM_URL: string = '/plugin/rolling-stocktake/next/';

function RenderStockItem({
  context,
  onCount,
  onDelete,
  item
}: {
  context: InvenTreePluginContext;
  item: any;
  onCount: () => void;
  onDelete: () => void;
}) {
  const navigateToItem = useCallback(() => {
    if (item && item.pk) {
      context.navigate(getDetailUrl(ModelType.stockitem, item.pk));
    }
  }, [item]);

  if (!item) {
    return (
      <Alert color='green' title='All done!'>
        <Text size='sm'>No more items to count!</Text>
      </Alert>
    );
  }

  return (
    <Stack gap='xs'>
      <Table>
        <Table.Tbody>
          <Table.Tr>
            <Table.Th>Stock Item</Table.Th>
            <Table.Td>
              {context.renderInstance({
                instance: item,
                model: ModelType.stockitem
              })}
            </Table.Td>
          </Table.Tr>
          {item.location_detail && (
            <Table.Tr>
              <Table.Th>Location</Table.Th>
              <Table.Td>
                {context.renderInstance({
                  instance: item.location_detail,
                  model: ModelType.stocklocation,
                  extra: {
                    show_location: false
                  }
                })}
              </Table.Td>
            </Table.Tr>
          )}
          {item.creation_date && (
            <Table.Tr>
              <Table.Th>Created</Table.Th>
              <Table.Td>
                <Text size='sm'>{item.creation_date}</Text>
              </Table.Td>
            </Table.Tr>
          )}
          <Table.Tr>
            <Table.Th>Last Stocktake</Table.Th>
            <Table.Td>
              {item.last_stocktake ? (
                <Text size='sm'>{item.last_stocktake}</Text>
              ) : (
                <Text c='red' size='sm'>
                  No stocktake data
                </Text>
              )}
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      <Divider />
      <Group grow>
        <Button
          color='blue'
          variant='light'
          leftSection={<IconEye />}
          onClick={navigateToItem}
        >
          View Item
        </Button>
        <Button
          color='green'
          variant='light'
          leftSection={<IconClipboardCheck />}
          onClick={onCount}
        >
          Count Stock
        </Button>
        <Button
          color='red'
          variant='light'
          leftSection={<IconTrash />}
          onClick={onDelete}
        >
          Delete Item
        </Button>
      </Group>
    </Stack>
  );
}

function RollingStocktakeDashboardItem({
  context
}: {
  context: InvenTreePluginContext;
}) {
  const itemQuery = useQuery(
    {
      enabled: true,
      queryKey: ['next-item'],
      queryFn: async () => {
        const response = await context.api?.get(NEXT_ITEM_URL);
        return response.data;
      }
    },
    queryClient
  );

  const stockItem = useMemo(() => {
    let item: any = itemQuery.data?.item ?? {};

    item = {
      ...item,
      creation_date: itemQuery?.data?.creation_date ?? null,
      stocktake_date: itemQuery?.data?.stocktake_date ?? null
    };

    return item;
  }, [itemQuery.data]);

  const countStockForm: any = context?.forms.stockActions.countStock({
    items: stockItem ? [stockItem] : [],
    model: ModelType.stockitem,
    refresh: () => itemQuery.refetch()
  });

  const deleteStockForm = context?.forms.stockActions.deleteStock({
    items: stockItem ? [stockItem] : [],
    model: ModelType.stockitem,
    refresh: () => itemQuery.refetch()
  });

  return (
    <Stack gap='xs'>
      {countStockForm?.modal}
      {deleteStockForm?.modal}
      <Group justify='space-between'>
        <Title c={context.theme.primaryColor} order={3}>
          Rolling Stocktake
        </Title>
        <ActionIcon variant='transparent' onClick={() => itemQuery.refetch()}>
          <IconRefresh />
        </ActionIcon>
      </Group>
      <Divider />
      {(itemQuery.isLoading || itemQuery.isFetching) && <Loader size='sm' />}
      {!itemQuery.isLoading && !itemQuery.isFetching && itemQuery.isError && (
        <Alert color='red' title='Error'>
          <Text size='sm'>Error loading stock information from server</Text>
        </Alert>
      )}
      {!itemQuery.isLoading && itemQuery.isSuccess && (
        <RenderStockItem
          context={context}
          item={stockItem}
          onCount={countStockForm.open}
          onDelete={deleteStockForm.open}
        />
      )}
    </Stack>
  );
}

// This is the function which is called by InvenTree to render the actual dashboard
//  component
export function renderRollingStocktakeDashboardItem(
  context: InvenTreePluginContext
) {
  checkPluginVersion(context);
  return <RollingStocktakeDashboardItem context={context} />;
}
