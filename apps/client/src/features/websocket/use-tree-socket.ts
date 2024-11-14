import { useEffect, useRef } from "react";
import { socketAtom } from "@/features/websocket/atoms/socket-atom.ts";
import { useAtom } from "jotai";
import { treeDataAtom } from "@/features/page/tree/atoms/tree-data-atom.ts";
import { WebSocketEvent } from "@/features/websocket/types";
import { SpaceTreeNode } from "@/features/page/tree/types.ts";
import { useQueryClient } from "@tanstack/react-query";
import { SimpleTree } from "react-arborist";

export const useTreeSocket = () => {
  const [socket] = useAtom(socketAtom);
  const [treeData, setTreeData] = useAtom(treeDataAtom);
  const queryClient = useQueryClient();
  const initialTreeData = useRef(treeData);

  useEffect(() => {
    initialTreeData.current = treeData;
  }, [treeData]);

  useEffect(() => {
    socket?.on("message", (event: WebSocketEvent) => {

      const initialData = initialTreeData.current;
      const treeApi = new SimpleTree<SpaceTreeNode>(initialData);

      switch (event.operation) {
        case "updateOne":
          if (event.entity[0] === "pages") {
            if (treeApi.find(event.id)) {
              if (event.payload?.title) {
                treeApi.update({ id: event.id, changes: { name: event.payload.title } });
              }
              if (event.payload?.icon) {
                treeApi.update({ id: event.id, changes: { icon: event.payload.icon } });
              }
              setTreeData(treeApi.data);
            }
          }
          break;
        case 'addTreeNode':
          if (treeApi.find(event.payload.data.id)) return;

          treeApi.create({ parentId: event.payload.parentId, index: event.payload.index, data: event.payload.data });
          setTreeData(treeApi.data);

          break;
        case 'moveTreeNode':
          // move node
          treeApi.move({
            id: event.payload.id,
            parentId: event.payload.parentId,
            index: event.payload.index
          });

          // update node position
          treeApi.update({
            id: event.payload.id,
            changes: {
              position: event.payload.position,
            }
          });

          setTreeData(treeApi.data);

          break;
        case "deleteTreeNode":
          treeApi.drop({ id: event.payload.node.id });
          setTreeData(treeApi.data);

          queryClient.invalidateQueries({
            queryKey: ['pages', event.payload.node.slugId].filter(Boolean),
          });
          break;
      }
    });
  }, [socket]);
};
