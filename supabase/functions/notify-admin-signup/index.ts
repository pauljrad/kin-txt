import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "hello@kin-txt.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignupNotification {
  email: string;
  displayName?: string;
  userId: string;
  createdAt: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, displayName, userId, createdAt }: SignupNotification = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const name = displayName || "Unknown";
    const formattedDate = new Date(createdAt).toLocaleString();

    // Send notification to admin
    const emailResponse = await resend.emails.send({
      from: "KiN-TXT Notifications <hello@kin-txt.com>",
      to: [ADMIN_EMAIL],
      subject: `🎉 New KiN-TXT Signup: ${email}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; text-align: center;">
                        🎉 New Signup!
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #333333;">
                        User Details
                      </h2>
                      
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee;">
                            <strong style="color: #666666;">Email:</strong>
                          </td>
                          <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; text-align: right;">
                            <span style="color: #333333;">${email}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee;">
                            <strong style="color: #666666;">Display Name:</strong>
                          </td>
                          <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; text-align: right;">
                            <span style="color: #333333;">${name}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee;">
                            <strong style="color: #666666;">User ID:</strong>
                          </td>
                          <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; text-align: right;">
                            <code style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #333333;">${userId}</code>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0;">
                            <strong style="color: #666666;">Signup Date:</strong>
                          </td>
                          <td style="padding: 12px 0; text-align: right;">
                            <span style="color: #333333;">${formattedDate}</span>
                          </td>
                        </tr>
                      </table>
                      
                      <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                        <p style="margin: 0; font-size: 14px; color: #666666;">
                          A welcome email with verification link has been automatically sent to the user.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #999999;">
                        KiN-TXT Admin Notification System
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Admin notification sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-admin-signup function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
