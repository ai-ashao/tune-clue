export type PendingRecognitionSource =
  | {
      kind: 'local-file'
      file: File
    }
  | {
      kind: 'tiktok-url'
      url: string
    }

let pendingSource: PendingRecognitionSource | undefined

export function setPendingRecognitionSource(source: PendingRecognitionSource) {
  pendingSource = source
}

export function takePendingRecognitionSource() {
  const current = pendingSource
  pendingSource = undefined
  return current
}

export function peekPendingRecognitionSource() {
  return pendingSource
}
