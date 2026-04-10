import { getMcpServer } from "@/lib/mcp/registry";
import { notFound } from "next/navigation";
import { McpDetailView } from "@/components/mcp/mcp-detail-view";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { IconServer } from "@tabler/icons-react";
import type { Metadata } from "next";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const server = await getMcpServer(slug);
  
  if (!server) {
    return {
      title: "Server Not Found | MCP Registry",
    };
  }
  
  return {
    title: `${server.name} - MCP Server | Nexis Network`,
    description: server.description,
  };
}

export default async function McpServerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const server = await getMcpServer(slug);

  if (!server) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 sticky top-0 z-20 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2 px-4 w-full">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/app" className="hidden sm:inline-block">App</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:inline-block" />
              <BreadcrumbItem>
                <BreadcrumbLink href="/mcp" className="flex items-center gap-2">
                  <IconServer className="h-4 w-4" />
                  MCP Catalog
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/mcp/${server.name}`} className="font-semibold text-foreground">
                  {server.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      
      <div className="flex-1 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto w-full">
        <McpDetailView server={server} />
      </div>
    </div>
  );
}
