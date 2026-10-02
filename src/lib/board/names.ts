import type { BoardData } from './types'

export function personName(data: BoardData, id: string | null | undefined): string {
  if (!id) return '—'
  const p = data.people.find((x) => x.id === id)
  return p?.name || '—'
}

export function profileName(data: BoardData, id: string | null | undefined): string {
  if (!id) return '—'
  const p = data.profiles.find((x) => x.id === id)
  return p?.fullName || p?.email || '—'
}

export function activePeople(data: BoardData) {
  return data.people.filter((p) => p.isActive)
}
