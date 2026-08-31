import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchFirestoreUserPreferences,
  saveFirestoreUserPreferences,
  upsertFirebaseUserProfile,
} from '@/services/userPersistence'

const firebaseRuntime = vi.hoisted(() => ({
  doc: vi.fn(),
  firestore: {},
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}))

vi.mock('@/services/firebase', () => ({ firestore: firebaseRuntime.firestore }))

vi.mock('firebase/firestore', () => ({
  doc: firebaseRuntime.doc,
  getDoc: firebaseRuntime.getDoc,
  serverTimestamp: firebaseRuntime.serverTimestamp,
  setDoc: firebaseRuntime.setDoc,
}))

describe('Firestore user persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    firebaseRuntime.doc.mockImplementation((_firestore, ...path) => path.join('/'))
    firebaseRuntime.serverTimestamp.mockReturnValue('server-timestamp')
    firebaseRuntime.setDoc.mockResolvedValue(undefined)
  })

  it('mirrors only public Firebase Auth profile claims in the user document', async () => {
    await upsertFirebaseUserProfile({
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada Lovelace',
      picture: 'https://example.com/ada.png',
      subject: 'firebase-ada',
    })

    expect(firebaseRuntime.setDoc).toHaveBeenCalledWith('users/firebase-ada', {
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      emailVerified: true,
      photoUrl: 'https://example.com/ada.png',
      uid: 'firebase-ada',
      updatedAt: 'server-timestamp',
    })
  })

  it('returns no preferences until the authenticated user owns a workspace settings document', async () => {
    firebaseRuntime.getDoc.mockResolvedValue({ exists: () => false })

    await expect(fetchFirestoreUserPreferences('firebase-ada')).resolves.toBeNull()
    expect(firebaseRuntime.getDoc).toHaveBeenCalledWith('users/firebase-ada/settings/workspace')
  })

  it('stores structured workspace settings beneath the authenticated user', async () => {
    const layout = { panelVisible: false }

    await saveFirestoreUserPreferences('firebase-ada', { layout, theme: 'dark' })

    expect(firebaseRuntime.setDoc).toHaveBeenCalledWith('users/firebase-ada/settings/workspace', {
      layout,
      theme: 'dark',
      updatedAt: 'server-timestamp',
    })
  })
})
