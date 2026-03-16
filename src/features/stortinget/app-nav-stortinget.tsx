"use client";

import { convexQuery } from "@convex-dev/react-query";
import { IconChevronRight, IconFiles, IconScale, IconUsersGroup } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "~/components/ui/sidebar";

import { api } from "../../../convex/_generated/api";

export function AppNavStortinget() {
  const { data: cases = [], isPending } = useQuery({
    ...convexQuery(api.cases.getCases),
    placeholderData: [],
  });
  const { data: hearings = [], isPending: isHearingsPending } = useQuery({
    ...convexQuery(api.hearings.getHearings),
    placeholderData: [],
  });

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Stortinget</SidebarGroupLabel>
      <SidebarMenu>
        <Collapsible defaultOpen render={<SidebarMenuItem />}>
          <SidebarMenuButton tooltip="Cases" render={<a href="#" />}>
            <IconScale />
            <span>Cases</span>
          </SidebarMenuButton>
          <CollapsibleTrigger render={<SidebarMenuAction className="aria-expanded:rotate-90" />}>
            <IconChevronRight />
            <span className="sr-only">Toggle</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {isPending
                ? Array.from({ length: 3 }, (_, index) => (
                    <SidebarMenuSubItem key={index}>
                      <SidebarMenuSkeleton />
                    </SidebarMenuSubItem>
                  ))
                : null}
              {!isPending && cases.length === 0 ? (
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton render={<a href="#" />}>
                    <span>No cases yet</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ) : null}
              {!isPending
                ? cases.map((item) => (
                    <SidebarMenuSubItem key={item.id}>
                      <SidebarMenuSubButton render={<a href="#" />}>
                        <IconFiles />
                        <span>{item.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))
                : null}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible defaultOpen render={<SidebarMenuItem />}>
          <SidebarMenuButton tooltip="Hearings" render={<a href="#" />}>
            <IconUsersGroup />
            <span>Hearings</span>
          </SidebarMenuButton>
          <CollapsibleTrigger render={<SidebarMenuAction className="aria-expanded:rotate-90" />}>
            <IconChevronRight />
            <span className="sr-only">Toggle</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {isHearingsPending
                ? Array.from({ length: 3 }, (_, index) => (
                    <SidebarMenuSubItem key={index}>
                      <SidebarMenuSkeleton />
                    </SidebarMenuSubItem>
                  ))
                : null}
              {!isHearingsPending && hearings.length === 0 ? (
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton render={<a href="#" />}>
                    <span>No hearings yet</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ) : null}
              {!isHearingsPending
                ? hearings.map((item) => (
                    <SidebarMenuSubItem key={item.id}>
                      <SidebarMenuSubButton render={<a href="#" />}>
                        <IconFiles />
                        <span>{item.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))
                : null}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  );
}
