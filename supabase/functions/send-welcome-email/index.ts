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
  verificationUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, displayName, verificationUrl }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const name = displayName || "Reader";
    const hasVerification = !!verificationUrl;

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
                        Welcome to KiN-TXT, ${name}!
                      </h2>
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #cccccc; text-align: center;">
                        Thank you for joining <strong style="color: #ffffff;">KiN-TXT</strong> – the future of reading is here! 🚀
                      </p>
                      <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.7; color: #cccccc; text-align: center;">
                        Experience kinetic typography that brings your texts to life, word by word, helping you focus and absorb content like never before. Read faster, comprehend better, and enjoy a completely new way of consuming content.
                      </p>
                      ${hasVerification ? `
                      <!-- Verification Button -->
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);">
                          ✓ Verify Your Email
                        </a>
                      </div>
                      <p style="margin: 20px 0 0 0; font-size: 14px; color: #888888; text-align: center;">
                        Please verify your email address to get started and unlock all features.
                      </p>
                      ` : ''}
                    </td>
                  </tr>
                  
                  <!-- Features -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px;">
                      <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #ffffff; text-align: center;">
                        What You Can Do
                      </h3>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding: 15px 0;">
                            <div style="display: flex; align-items: flex-start;">
                              <span style="font-size: 24px; margin-right: 15px;">📚</span>
                              <div>
                                <strong style="color: #ffffff; font-size: 16px;">Upload & Read</strong>
                                <p style="margin: 5px 0 0 0; color: #cccccc; font-size: 14px; line-height: 1.6;">
                                  Import EPUB, PDF, DOCX files or paste text directly
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 15px 0;">
                            <div style="display: flex; align-items: flex-start;">
                              <span style="font-size: 24px; margin-right: 15px;">⚡</span>
                              <div>
                                <strong style="color: #ffffff; font-size: 16px;">Kinetic Reading</strong>
                                <p style="margin: 5px 0 0 0; color: #cccccc; font-size: 14px; line-height: 1.6;">
                                  Watch words flow with customizable speed and rhythm
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 15px 0;">
                            <div style="display: flex; align-items: flex-start;">
                              <span style="font-size: 24px; margin-right: 15px;">🤖</span>
                              <div>
                                <strong style="color: #ffffff; font-size: 16px;">AI-Powered Emphasis</strong>
                                <p style="margin: 5px 0 0 0; color: #cccccc; font-size: 14px; line-height: 1.6;">
                                  Smart highlighting of important words and phrases
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 15px 0;">
                            <div style="display: flex; align-items: flex-start;">
                              <span style="font-size: 24px; margin-right: 15px;">📱</span>
                              <div>
                                <strong style="color: #ffffff; font-size: 16px;">Read Anywhere</strong>
                                <p style="margin: 5px 0 0 0; color: #cccccc; font-size: 14px; line-height: 1.6;">
                                  Works on all devices with offline PWA support
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </table>
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
