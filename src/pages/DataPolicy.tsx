import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const Section = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="font-display text-lg tracking-widest text-foreground mb-3 uppercase">
      {number}. {title}
    </h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
      {children}
    </div>
  </div>
);

export default function DataPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <ThemeToggle />
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="absolute left-4 z-50 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </motion.button>

      <div className="flex-1 max-w-2xl mx-auto px-6 pt-[calc(6.5rem+env(safe-area-inset-top,0px))] pb-16 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">KiN-TXT</p>
          <h1 className="font-display text-4xl tracking-wide text-foreground mb-2">Data Policy</h1>
          <p className="text-xs text-muted-foreground mb-10">Last updated: June 2026</p>

          <Section number="1" title="Role of this Policy">
            <p>This Data Policy explains how KiN-TXT handles, stores, and protects data at a system level. It complements the Privacy Policy, which explains what data we collect and your rights as a user.</p>
          </Section>

          <Section number="2" title="Data Controller">
            <p>KiN-TXT is the data controller responsible for data processed through the Service.</p>
          </Section>

          <Section number="3" title="Data Minimisation">
            <p>KiN-TXT is designed to collect and process the minimum amount of data necessary to operate the Service. We do not collect unnecessary personal or behavioural data beyond what is required for functionality, security, and reliability. Systems are designed to avoid excessive data collection or retention.</p>
          </Section>

          <Section number="4" title="Data Storage and Infrastructure">
            <p>Data is stored using secure infrastructure provided by trusted service providers. We take reasonable measures to ensure that:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>data is protected against unauthorised access</li>
              <li>access is restricted to authorised systems and personnel</li>
              <li>systems are maintained and kept up to date</li>
            </ul>
          </Section>

          <Section number="5" title="Access Controls">
            <p>Access to data is limited strictly to authorised personnel and systems where required to operate, maintain, or secure the Service. Access is granted on a limited and controlled basis. We implement controls designed to restrict unauthorised access, prevent misuse of data, and maintain system integrity.</p>
          </Section>

          <Section number="6" title="Data Integrity">
            <p>We take reasonable steps to ensure that data is accurate where required and protected from unauthorised alteration or corruption. Systems are designed to maintain consistency and reliability of stored data.</p>
          </Section>

          <Section number="7" title="Data Retention">
            <p>Data is retained only for as long as necessary to operate the Service, maintain system integrity, and comply with legal obligations. Data that is no longer required is deleted or securely removed.</p>
          </Section>

          <Section number="8" title="Legal Basis">
            <p>Data processing is carried out in accordance with applicable law, including:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Contract — to provide the Service</li>
              <li>Legitimate interest — to operate, secure, and improve the platform</li>
            </ul>
          </Section>

          <Section number="9" title="Data Processors">
            <p>KiN-TXT may use trusted third-party providers to support hosting and infrastructure, payment processing, and core service functionality. These providers process data only as necessary and are required to handle data securely and in accordance with applicable law.</p>
          </Section>

          <Section number="10" title="Security Measures">
            <p>We implement appropriate technical and organisational measures to protect data, including measures designed to prevent unauthorised access, maintain system security, and reduce the risk of data loss or misuse. However, no system is completely secure, and absolute security cannot be guaranteed.</p>
          </Section>

          <Section number="11" title="Data Breaches">
            <p>In the event of a data breach, KiN-TXT will investigate the incident, take steps to contain and mitigate its impact, take appropriate corrective action, and notify affected users and relevant authorities where required by law.</p>
          </Section>

          <Section number="12" title="Deletion and Erasure">
            <p>You can permanently delete your account and associated data at any time from within the app via <span className="text-foreground">Account &amp; Settings → Delete account</span>. On deletion, your profile, saved texts, reading progress, and connections are removed from our active systems, except where limited retention is required by law. Backups containing residual data are overwritten on their normal rotation cycle.</p>
          </Section>

          <Section number="13" title="Contact">
            <p><a href="mailto:hello@kin-txt.com" className="text-foreground underline underline-offset-2">hello@kin-txt.com</a></p>
          </Section>
        </motion.div>
      </div>
    </div>
  );
}
