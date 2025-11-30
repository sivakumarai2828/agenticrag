import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TransactionQuery {
  query: string;
  clientId?: string;
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
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

    const requestData: TransactionQuery = await req.json();
    const { query, clientId, type, status, dateFrom, dateTo, limit = 100 } = requestData;

    console.log('Transaction query received:', requestData);

    let dbQuery = supabase
      .from('transactions')
      .select('*')
      .order('tran_date', { ascending: false })
      .limit(limit);

    if (clientId) {
      dbQuery = dbQuery.eq('client_id', clientId);
    }

    if (type) {
      dbQuery = dbQuery.eq('type', type.toUpperCase());
    }

    if (status) {
      dbQuery = dbQuery.eq('tran_status', status.toUpperCase());
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

    const totalAmount = transactions?.reduce((sum, t) => sum + parseFloat(t.tran_amt.toString()), 0) || 0;
    const approvedCount = transactions?.filter(t => t.tran_status === 'APPROVED').length || 0;
    const declinedCount = transactions?.filter(t => t.tran_status === 'DECLINED').length || 0;

    const summary = {
      totalTransactions: transactions?.length || 0,
      totalAmount: totalAmount.toFixed(2),
      approvedCount,
      declinedCount,
      transactions: transactions || [],
    };

    const voiceSummary = `Found ${summary.totalTransactions} transactions totaling $${summary.totalAmount}. ${approvedCount} approved, ${declinedCount} declined.`;

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        voiceSummary,
        query,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Transaction query error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
