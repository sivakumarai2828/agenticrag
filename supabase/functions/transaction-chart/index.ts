import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ChartRequest {
  query: string;
  clientId?: string;
  chartType?: 'bar' | 'line' | 'pie';
  dateFrom?: string;
  dateTo?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData: ChartRequest = await req.json();
    const { query, clientId, chartType = 'bar', dateFrom, dateTo } = requestData;

    console.log('Chart generation request:', requestData);

    let dbQuery = supabase
      .from('transactions')
      .select('*')
      .order('tran_date', { ascending: true });

    if (clientId) {
      dbQuery = dbQuery.eq('client_id', clientId);
    }

    if (dateFrom) {
      dbQuery = dbQuery.gte('tran_date', dateFrom);
    }

    if (dateTo) {
      dbQuery = dbQuery.lte('tran_date', dateTo);
    }

    const { data: transactions, error } = await dbQuery;

    if (error) {
      console.error('Database query error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to query transactions', details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const chartData = {
      type: chartType,
      data: {
        labels: [] as string[],
        datasets: [] as any[],
      }
    };

    if (chartType === 'pie') {
      const statusCounts: Record<string, number> = {};
      transactions?.forEach(t => {
        statusCounts[t.tran_status] = (statusCounts[t.tran_status] || 0) + 1;
      });

      chartData.data.labels = Object.keys(statusCounts);
      chartData.data.datasets = [{
        label: 'Transaction Status Distribution',
        data: Object.values(statusCounts),
        color: '#8b5cf6',
      }];
    } else if (chartType === 'line' || chartType === 'bar') {
      const dateGroups: Record<string, number> = {};
      transactions?.forEach(t => {
        const date = new Date(t.tran_date);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
        dateGroups[formattedDate] = (dateGroups[formattedDate] || 0) + parseFloat(t.tran_amt.toString());
      });

      const sortedDates = Object.keys(dateGroups);
      chartData.data.labels = sortedDates;
      chartData.data.datasets = [{
        label: 'Transaction Amount',
        data: sortedDates.map(date => parseFloat(dateGroups[date].toFixed(2))),
        color: '#8b5cf6',
      }];
    }

    const voiceSummary = `Generated ${chartType} chart showing ${transactions?.length || 0} transactions.`;

    return new Response(
      JSON.stringify({
        success: true,
        chartData,
        voiceSummary,
        transactionCount: transactions?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Chart generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
