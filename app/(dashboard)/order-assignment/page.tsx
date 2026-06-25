import { redirect } from 'next/navigation'

// Order assignment now lives under the Orders section (Assignment tab).
export default function OrderAssignmentRedirect() {
  redirect('/orders')
}
