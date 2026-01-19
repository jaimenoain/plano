import { useOutletContext } from "react-router-dom";
import { PipelineTab } from "./PipelineTab";
import { JoinGroupPrompt } from "@/components/groups/JoinGroupPrompt";

export function PipelineTabWrapper() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { group, isMember } = useOutletContext<{ group: any; isMember: boolean }>();

  if (!group?.id) return null;

  if (!isMember) {
    return <JoinGroupPrompt group={group} />;
  }

  return <PipelineTab groupId={group.id} />;
}
