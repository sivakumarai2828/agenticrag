const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailRequest {
  to: string;
  subject: string;
  transactionSummary: any;
  chartData?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured. Email functionality disabled.');
      return new Response(
        JSON.stringify({
          error: 'Email service not configured',
          message: 'Please configure RESEND_API_KEY to enable email reports'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requestData: EmailRequest = await req.json();
    const { to, subject, transactionSummary, chartData } = requestData;

    console.log('Email report request:', { to, subject });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 20px; border-radius: 8px; }
            .summary { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .stat { display: inline-block; margin: 10px 20px 10px 0; }
            .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
            .stat-value { font-size: 24px; font-weight: bold; color: #1f2937; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #8b5cf6; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            tr:nth-child(even) { background: #f9fafb; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Transaction Intelligence Report</h1>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>

            <div class="summary">
              <div class="stat">
                <div class="stat-label">Total Transactions</div>
                <div class="stat-value">${transactionSummary.totalTransactions}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Total Amount</div>
                <div class="stat-value">$${transactionSummary.totalAmount}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Approved</div>
                <div class="stat-value">${transactionSummary.approvedCount}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Declined</div>
                <div class="stat-value">${transactionSummary.declinedCount}</div>
              </div>
            </div>

            <h2>Transaction Details</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${transactionSummary.transactions.slice(0, 20).map((t: any) => `
                  <tr>
                    <td>${t.id}</td>
                    <td>${t.client_id}</td>
                    <td>${t.type}</td>
                    <td>$${parseFloat(t.tran_amt).toFixed(2)}</td>
                    <td>${t.tran_status}</td>
                    <td>${new Date(t.tran_date).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${transactionSummary.transactions.length > 20 ? `<p><em>Showing first 20 of ${transactionSummary.transactions.length} transactions</em></p>` : ''}

            <div class="footer">
              <p>This is an automated report from your Agentic RAG Transaction Intelligence system.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailPayload = {
      from: 'Transaction Intelligence <onboarding@resend.dev>',
      to: [to],
      subject: subject || 'Transaction Intelligence Report',
      html: htmlContent,
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: result }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Email sent successfully:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        emailId: result.id,
        voiceSummary: `Transaction report sent to ${to}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
