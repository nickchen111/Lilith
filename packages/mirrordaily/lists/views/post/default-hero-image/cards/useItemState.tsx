import { useCallback, useMemo, useState } from 'react'
import { FieldMeta, ListMeta } from '@keystone-6/core/types'
import { DataGetter, makeDataGetter } from '@keystone-6/core/admin-ui/utils'
import { gql, useQuery } from '@keystone-6/core/admin-ui/apollo'
import { controller } from '..'

type ItemsState =
  | {
      kind: 'loading'
    }
  | { kind: 'error'; message: string }
  | { kind: 'loaded' }

type Items = Record<string, DataGetter<{ id: string; [key: string]: any }>>

export function useItemState({
  selectedFields,
  localList,
  id,
  field,
}: {
  selectedFields: string
  localList: ListMeta
  field: ReturnType<typeof controller>
  id: string | null
}) {
  const { data, error, loading } = useQuery(
    gql`query($id: ID!) {
  item: ${localList.gqlNames.itemQueryName}(where: {id: $id}) {
    id
    relationship: ${field.path} {
      ${selectedFields}
    }
  }
}`,
    { variables: { id }, errorPolicy: 'all', skip: id === null }
  )
  const { itemsArrFromData, relationshipGetter } = useMemo(() => {
    const dataGetter = makeDataGetter(data, error?.graphQLErrors)
    const relationshipGetter = dataGetter.get('item').get('relationship')
    const isMany = Array.isArray(relationshipGetter.data)
    const itemsArrFromData: DataGetter<{
      id: string
      [key: string]: any
    }>[] = (
      isMany
        ? relationshipGetter.data.map((_: any, i: number) =>
            relationshipGetter.get(i)
          )
        : [relationshipGetter]
    ).filter((x: DataGetter<any>) => x.data?.id != null)
    return { relationshipGetter, itemsArrFromData }
  }, [data, error])
  // eslint-disable-next-line
  let [{ items, itemsArrFromData: itemsArrFromDataState }, setItemsState] = useState<{ 
      itemsArrFromData: DataGetter<any>[]
      items: Record<
        string,
        {
          current: DataGetter<{ id: string; [key: string]: any }>
          fromInitialQuery:
            | DataGetter<{ id: string; [key: string]: any }>
            | undefined
        }
      >
    }>({ itemsArrFromData: [], items: {} })

  if (itemsArrFromDataState !== itemsArrFromData) {
    const newItems: Record<
      string,
      {
        current: DataGetter<{ id: string; [key: string]: any }>
        fromInitialQuery:
          | DataGetter<{ id: string; [key: string]: any }>
          | undefined
      }
    > = {}

    itemsArrFromData.forEach((item) => {
      const initialItemInState = items[item.data.id]?.fromInitialQuery
      if (
        ((items[item.data.id] && initialItemInState) || !items[item.data.id]) &&
        (!initialItemInState ||
          item.data !== initialItemInState.data ||
          item.errors?.length !== initialItemInState.errors?.length ||
          (item.errors || []).some(
            (err, i) => err !== initialItemInState.errors?.[i]
          ))
      ) {
        newItems[item.data.id] = { current: item, fromInitialQuery: item }
      } else {
        newItems[item.data.id] = items[item.data.id]
      }
    })
    items = newItems
    setItemsState({
      items: newItems,
      itemsArrFromData,
    })
  }

  return {
    items: useMemo(() => {
      const itemsToReturn: Items = {}
      Object.keys(items).forEach((id) => {
        itemsToReturn[id] = items[id].current
      })
      return itemsToReturn
    }, [items]),
    setItems: useCallback(
      (items: Items) => {
        setItemsState((state) => {
          const itemsForState: (typeof state)['items'] = {}
          Object.keys(items).forEach((id) => {
            if (items[id] === state.items[id]?.current) {
              itemsForState[id] = state.items[id]
            } else {
              itemsForState[id] = {
                current: items[id],
                fromInitialQuery: state.items[id]?.fromInitialQuery,
              }
            }
          })
          return {
            itemsArrFromData: state.itemsArrFromData,
            items: itemsForState,
          }
        })
      },
      [setItemsState]
    ),
    state: ((): ItemsState => {
      if (id === null) {
        return { kind: 'loaded' }
      }
      if (loading) {
        return { kind: 'loading' }
      }
      if (error?.networkError) {
        return { kind: 'error', message: error.networkError.message }
      }
      if (field.many && !relationshipGetter.data) {
        return {
          kind: 'error',
          message: relationshipGetter.errors?.[0].message || '',
        }
      }
      return { kind: 'loaded' }
    })(),
  }
}

export function useFieldsObj(
  list: ListMeta,
  fields: readonly string[] | undefined
) {
  return useMemo(() => {
    const editFields: Record<string, FieldMeta> = {}
    fields?.forEach((fieldPath) => {
      editFields[fieldPath] = list.fields[fieldPath]
    })
    return editFields
  }, [fields, list.fields])
}
