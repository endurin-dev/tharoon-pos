import DailySummaryReport from '@/components/DailySummaryReport';

function isValidDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const date = isValidDate(requestedDate)
    ? requestedDate
    : new Date().toISOString().slice(0, 10);

  return <DailySummaryReport initialDate={date} />;
}
