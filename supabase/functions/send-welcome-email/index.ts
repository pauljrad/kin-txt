import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  displayName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, displayName }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const name = displayName || "Reader";

    const emailResponse = await resend.emails.send({
      from: "KiN-TXT <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to KiN-TXT ✨",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" max-width="500" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #0a0a0a;">
                  
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom: 30px;">
                      <h1 style="margin: 0; font-size: 48px; font-weight: 700; letter-spacing: -2px; color: #ffffff;">
                        KiN<span style="color: #a855f7;">-</span>TXT
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Animated text representation -->
                  <tr>
                    <td align="center" style="padding-bottom: 40px;">
                      <div style="font-size: 24px; letter-spacing: 8px; color: #666666;">
                        <span style="color: #ffffff; font-weight: 600;">READ</span>
                        <span style="color: #a855f7;">·</span>
                        <span style="color: #888888;">FLOW</span>
                        <span style="color: #a855f7;">·</span>
                        <span style="color: #555555;">ABSORB</span>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Welcome message -->
                  <tr>
                    <td style="padding: 40px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; border: 1px solid #333333;">
                      <h2 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 600; color: #ffffff; text-align: center;">
                        Welcome, ${name}!
                      </h2>
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #cccccc; text-align: center;">
                        Thank you for joining <strong style="color: #ffffff;">KiN-TXT</strong>. You're about to experience reading in a completely new way.
                      </p>
                      <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #cccccc; text-align: center;">
                        Kinetic typography brings your texts to life, word by word, helping you focus and absorb content like never before.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Divider -->
                  <tr>
                    <td style="padding: 40px 0;" align="center">
                      <div style="width: 60px; height: 2px; background: linear-gradient(90deg, transparent, #a855f7, transparent);"></div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td align="center">
                      <p style="margin: 0; font-size: 14px; color: #666666;">
                        Experience the future of reading
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

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
