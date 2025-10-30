import { AppSidebar } from '../AppSidebar'
import { SidebarProvider } from "@/components/ui/sidebar"
import { Router } from "wouter"

export default function AppSidebarExample() {
  return (
    <Router>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </Router>
  )
}
