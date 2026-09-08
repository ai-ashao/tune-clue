export function ToolStructuredData({
  items,
}: Readonly<{
  items: ReadonlyArray<Record<string, unknown>>
}>) {
  return (
    <>
      {items.map((item, index) => (
        <script key={`${String(item['@type'] ?? 'schema')}-${index}`} type="application/ld+json">
          {JSON.stringify(item).replace(/</g, '\\u003c')}
        </script>
      ))}
    </>
  )
}
