import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  displayName?: string;
  verificationUrl?: string; // New field from trigger
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, displayName, verificationUrl: incomingUrl }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`[Welcome Email] Attempting to send to ${email}`);

    let verificationUrl = incomingUrl;

    // Sanitize any Vercel links if they somehow slip through
    if (verificationUrl && verificationUrl.includes('vercel.app')) {
      console.log("[Welcome Email] Sanitizing Vercel link...");
      verificationUrl = verificationUrl.replace(/https:\/\/[^/]+\.vercel\.app/, 'https://kin-txt.com');
    }

    if (!verificationUrl) {
      // Initialize Supabase Admin Client for fallback link generation
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Generate Verification Link (Fallback)
      console.log("[Welcome Email] Generating verification link (fallback)...");
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink", // Reverted to magiclink
        email: email,
        options: {
          redirectTo: "https://kin-txt.com/?verified=true",
        },
      });

      if (linkError) {
        console.error("[Welcome Email] Error generating verification link:", linkError);
        throw linkError;
      }

      verificationUrl = linkData.properties?.action_link;
    }

    console.log("[Welcome Email] Verification link confirmed");

    console.log(`[Welcome Email] Sending email via Resend...`);

    const emailResponse = await resend.emails.send({
      from: "KiN-TXT <hello@kin-txt.com>",
      to: [email],
      subject: "Welcome to KiN-TXT",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Courier+Prime&family=Inter:wght@400;600&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Inter', sans-serif; color: #ffffff;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000; width: 100%; height: 100%;">
            <tr>
              <td align="center" style="padding: 60px 20px;">
                <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #000000;">
                  
                  <!-- Greeting -->
                  <tr>
                    <td align="center" style="padding-bottom: 30px;">
                      <div style="font-family: 'Inter', sans-serif; font-size: 16px; color: #ffffff; line-height: 1.6;">
                        Hello,<br>
                        Welcome to <strong>KiN-TXT</strong>
                      </div>
                    </td>
                  </tr>

                  <!-- Button -->
                  <tr>
                    <td align="center" style="padding-bottom: 60px;">
                      <a href="${verificationUrl}" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 16px 32px; font-size: 12px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 2px;">
                        CLICK HERE TO VERIFY EMAIL
                      </a>
                    </td>
                  </tr>

                  <!-- Closing -->
                  <tr>
                    <td align="center" style="padding-bottom: 40px;">
                      <div style="font-family: 'Inter', sans-serif; font-size: 14px; color: #ffffff; line-height: 1.6;">
                        Thank you for joining :)<br><br>
                        <strong>KiN-TXT</strong>
                      </div>
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

    console.log("[Welcome Email] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[Welcome Email] Error in function:", error);
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
