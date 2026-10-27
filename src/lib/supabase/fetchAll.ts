// Supabase returns at most 1000 rows per request, no matter what .limit() says.
// fetchAll walks through the pages so Jan-Sep bank data is never cut off.
export async function fetchAll<T>(
  make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error?: unknown }>,
  pageSize = 1000,
  maxRows = 30000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data } = await make(from, from + pageSize - 1);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < pageSize) break;
  }
  return out;
}
