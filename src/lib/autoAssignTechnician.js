import { supabase } from './supabaseClient'

/**
 * Auto-assigns an issue to the technician with the fewest open issues.
 * Returns the assigned technician's profile ID, or null if no technicians exist.
 */
export async function autoAssignTechnician() {
  if (!supabase) return null

  // Get all technicians
  const { data: technicians } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'technician')

  if (!technicians || technicians.length === 0) return null

  // Get count of open issues per technician
  const { data: openIssues } = await supabase
    .from('issues')
    .select('assigned_technician')
    .not('status', 'in', '("Resolved","Closed")')
    .not('assigned_technician', 'is', null)

  const workload = {}
  for (const tech of technicians) {
    workload[tech.id] = 0
  }
  for (const issue of openIssues || []) {
    if (workload[issue.assigned_technician] !== undefined) {
      workload[issue.assigned_technician]++
    }
  }

  // Find technician with the lowest workload
  let minWorkload = Infinity
  let assignedTech = null

  for (const tech of technicians) {
    const count = workload[tech.id] || 0
    if (count < minWorkload) {
      minWorkload = count
      assignedTech = tech.id
    }
  }

  return assignedTech
}

/**
 * Assigns a specific issue to the least-loaded technician.
 * Call this when a new issue is created without an explicit assignment.
 */
export async function assignNewIssue(issueId) {
  if (!supabase || !issueId) return

  const techId = await autoAssignTechnician()
  if (!techId) return

  await supabase
    .from('issues')
    .update({ assigned_technician: techId, status: 'Assigned' })
    .eq('id', issueId)
}
