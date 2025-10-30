import { Header } from '../Header'
import { SidebarProvider } from "@/components/ui/sidebar"

export default function HeaderExample() {
  return (
    <SidebarProvider>
      <Header />
    </SidebarProvider>
  )
}
