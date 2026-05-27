// Import for type checking
import {
  checkPluginVersion,
  getDetailUrl,
  type InvenTreePluginContext,
  ModelType,
  navigateToLink
} from '@inventreedb/ui';
import { t } from '@lingui/core/macro';
import {
  ActionIcon,
  Alert,
  Divider,
  Group,
  Loader,
  Progress,
  Stack,
  Table,
  Text,
  Title,
  Tooltip
} from '@mantine/core';
import {
  IconCircleCheck,
  IconClipboardCheck,
  IconEye,
  IconRefresh,
  IconTrash
} from '@tabler/icons-react';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Creature } from './Creature';
import { LocalizedComponent } from './locale';

const queryClient = new QueryClient();

const NEXT_ITEM_URL: string = '/plugin/rolling-stocktake/next/';

function RenderStockItem({
  context,
  item
}: {
  context: InvenTreePluginContext;
  item: any;
}) {
  if (!item.pk) {
    return (
      <Alert
        color='green'
        title={t`All up to date!`}
        icon={<IconCircleCheck />}
      >
        <Text size='sm'>{t`Nice work, you have counted enough items this week.`}</Text>
      </Alert>
    );
  }

  return (
    <Stack gap='xs'>
      <Table>
        <Table.Tbody>
          <Table.Tr>
            <Table.Th>{t`Stock Item`}</Table.Th>
            <Table.Td>
              {context.renderInstance({
                instance: item,
                model: ModelType.stockitem
              })}
            </Table.Td>
          </Table.Tr>
          {item.location_detail && (
            <Table.Tr>
              <Table.Th>{t`Location`}</Table.Th>
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
              <Table.Th>{t`Created`}</Table.Th>
              <Table.Td>
                <Text size='sm'>{item.creation_date}</Text>
              </Table.Td>
            </Table.Tr>
          )}
          {item.updated && (
            <Table.Tr>
              <Table.Th>{t`Last Updated`}</Table.Th>
              <Table.Td>
                <Text size='sm'>{item.updated}</Text>
              </Table.Td>
            </Table.Tr>
          )}
          <Table.Tr>
            <Table.Th>{t`Last Stocktake`}</Table.Th>
            <Table.Td>
              {item.last_stocktake ? (
                <Text size='sm'>{item.last_stocktake}</Text>
              ) : (
                <Text c='red' size='sm'>
                  {t`No stocktake data`}
                </Text>
              )}
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function RollingStocktakeDashboardItem({
  context
}: {
  context: InvenTreePluginContext;
}) {
  const weeklyLimit = useMemo(() => {
    return context.context?.settings?.WEEKLY_LIMIT ?? 0;
  }, [context.context?.settings]);

  const displayCreature = useMemo(() => {
    return context.context?.settings?.DISPLAY_CREATURE ?? false;
  }, [context.context?.settings]);

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

    if (item?.pk) {
      item = {
        ...item,
        creation_date: itemQuery?.data?.creation_date ?? null,
        stocktake_date: itemQuery?.data?.stocktake_date ?? null
      };
    }

    return item;
  }, [itemQuery.data]);

  const health = useMemo(() => {
    if (!weeklyLimit) return 0;
    return (itemQuery.data?.user_count ?? 0) / weeklyLimit;
  }, [itemQuery.data?.user_count, weeklyLimit]);

  const [justFed, setJustFed] = useState(false);
  const feedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onFed = useCallback(() => {
    itemQuery.refetch();
    setJustFed(true);
    if (feedTimer.current) clearTimeout(feedTimer.current);
    feedTimer.current = setTimeout(() => setJustFed(false), 1500);
  }, [itemQuery]);

  const countStockForm: any = context?.forms.stockActions.countStock({
    items: stockItem ? [stockItem] : [],
    model: ModelType.stockitem,
    refresh: onFed
  });

  const deleteStockForm = context?.forms.stockActions.deleteStock({
    items: stockItem ? [stockItem] : [],
    model: ModelType.stockitem,
    refresh: onFed
  });

  return (
    <Stack gap='xs'>
      {countStockForm?.modal}
      {deleteStockForm?.modal}
      <Group justify='space-between'>
        <Group gap='xs' align='center'>
          {displayCreature && <Creature health={health} justFed={justFed} />}
          <Title c={context.theme.primaryColor} order={4}>
            {t`Rolling Stocktake`}
          </Title>
        </Group>
        <Group justify='right'>
          {stockItem?.pk && (
            <Tooltip label='View item'>
              <ActionIcon
                color='blue'
                variant='transparent'
                onClick={(event: any) =>
                  navigateToLink(
                    getDetailUrl(ModelType.stockitem, stockItem.pk),
                    context.navigate,
                    event
                  )
                }
              >
                <IconEye />
              </ActionIcon>
            </Tooltip>
          )}
          {stockItem?.pk && (
            <Tooltip label='Count item'>
              <ActionIcon
                color='green'
                variant='transparent'
                onClick={() => countStockForm.open()}
              >
                <IconClipboardCheck />
              </ActionIcon>
            </Tooltip>
          )}
          {stockItem?.pk && (
            <Tooltip label='Delete item'>
              <ActionIcon
                color='red'
                variant='transparent'
                onClick={() => deleteStockForm.open()}
              >
                <IconTrash />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label='Refresh'>
            <ActionIcon
              variant='transparent'
              onClick={() => itemQuery.refetch()}
            >
              <IconRefresh />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      <Divider />
      <Progress
        value={(100 * (itemQuery.data?.user_count ?? 0)) / weeklyLimit}
        size='sm'
      />
      {(itemQuery.isLoading || itemQuery.isFetching) && <Loader size='sm' />}
      {!itemQuery.isLoading && !itemQuery.isFetching && itemQuery.isError && (
        <Alert color='red' title='Error'>
          <Text size='sm'>{t`Error loading stock information from server.`}</Text>
        </Alert>
      )}
      {!itemQuery.isLoading && itemQuery.isSuccess && (
        <RenderStockItem context={context} item={stockItem} />
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
  return (
    <LocalizedComponent locale={context.locale}>
      <RollingStocktakeDashboardItem context={context} />
    </LocalizedComponent>
  );
}
