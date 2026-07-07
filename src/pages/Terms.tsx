import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const Section = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="font-display text-lg tracking-widest text-foreground mb-3 uppercase">{number}. {title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const Sub = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-3">
    <p className="text-foreground/70 text-xs uppercase tracking-widest mb-1">{title}</p>
    {children}
  </div>
);

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc list-inside space-y-1 mt-1">{items.map(i => <li key={i}>{i}</li>)}</ul>
);

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <ThemeToggle />
      <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate(-1)}
        className="absolute left-4 z-50 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <ArrowLeft className="w-4 h-4" /> Back
      </motion.button>
      <div className="flex-1 max-w-2xl mx-auto px-6 pt-[calc(6.5rem+env(safe-area-inset-top,0px))] pb-16 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">KiN-TXT</p>
          <h1 className="font-display text-4xl tracking-wide text-foreground mb-2">Terms of Use</h1>
          <p className="text-xs text-muted-foreground mb-4">Last updated: June 2026</p>
          <p className="text-sm text-muted-foreground mb-10">These Terms govern your use of KiN-TXT ("the Service"). By creating an account or using the Service, you agree to be bound by them. If you do not agree, you must not use KiN-TXT.</p>

          <Section number="1" title="About KiN-TXT">
            <p>KiN-TXT is a digital reading interface that presents text in a time-based, kinetic format. It operates solely as a tool for interacting with text. KiN-TXT:</p>
            <List items={['does not act as a publisher, editor, or distributor of user content','does not create or modify underlying textual works','does not verify the accuracy, legality, or ownership of content']} />
            <p className="mt-2">All content accessed through KiN-TXT is used at your own risk.</p>
            <p>The Service is provided for general use only. It is not intended to be relied upon for any specific outcome or purpose.</p>
          </Section>

          <Section number="2" title="Eligibility">
            <p>You must be at least 13 years old to use KiN-TXT.</p>
            <p>If you are under 18, you confirm that:</p>
            <List items={['you have permission from a parent or legal guardian','they accept these Terms on your behalf']} />
            <p>KiN-TXT does not knowingly provide services to children under 13.</p>
          </Section>

          <Section number="3" title="Accounts">
            <p>To use certain features, you must create an account.</p>
            <p>You agree to:</p>
            <List items={['provide accurate information','keep your login details secure','notify us of unauthorised access']} />
            <p>You are fully responsible for all activity under your account.</p>
            <p>KiN-TXT reserves the right to:</p>
            <List items={['suspend or restrict access','terminate accounts','remove or limit features']} />
            <p>…where misuse, breach, risk, or abnormal usage patterns are identified.</p>
            <p>We are not liable for loss resulting from unauthorised account use.</p>
          </Section>

          <Section number="4" title="Acceptable Use">
            <p>You agree not to use KiN-TXT to:</p>
            <Sub title="4.1 Illegal or Unauthorised Activity"><List items={['violate any applicable law or regulation','process or store unlawful material']} /></Sub>
            <Sub title="4.2 Intellectual Property Abuse"><List items={['upload or use content without rights','process pirated, scraped, or unauthorised datasets at scale']} /></Sub>
            <Sub title="4.3 Platform Abuse"><List items={['interfere with or disrupt the Service','attempt to bypass security or access controls','probe, scan, or test system vulnerabilities']} /></Sub>
            <Sub title="4.4 System Extraction / Replication"><List items={['reverse engineer, decompile, or attempt to extract source code','replicate or compete with the core functionality of KiN-TXT']} /></Sub>
            <Sub title="4.5 Automated Use"><List items={['use bots, scripts, or automated systems to access or extract data','overload or disproportionately burden infrastructure']} /></Sub>
            <Sub title="4.6 User Harm"><List items={['harass, threaten, or harm other users','misuse connection features ("KiNs")']} /></Sub>
            <p className="mt-3">You must not use the Service in violation of export control or sanctions laws.</p>
            <p>KiN-TXT may investigate and take action, including suspension or termination, without notice.</p>
          </Section>

          <Section number="5" title='KiNs (Connections)'>
            <p>Where available, KiN-TXT may allow users to connect ("KiNs").</p>
            <p>We:</p>
            <List items={['do not verify user identity','do not monitor interactions']} />
            <p>You use this feature at your own risk.</p>
            <p>KiN-TXT may restrict, modify, or remove this feature at any time.</p>
          </Section>

          <Section number="6" title="User Content">
            <p>Users may upload text for private use within the Service.</p>
            <p>By uploading content, you represent and warrant that:</p>
            <List items={['you own or have the necessary rights','your use complies with all applicable laws']} />
            <Sub title="6.1 Nature of Content">
              <p>User content is:</p>
              <List items={['private by default','not publicly searchable or indexed','not distributed or promoted by KiN-TXT']} />
            </Sub>
            <Sub title="6.2 Licence">
              <p>You grant KiN-TXT a limited, non-exclusive, worldwide licence to host, process, format, and display your content solely for the purpose of operating the Service.</p>
              <p>This licence ends when your content is deleted, except where retention is required by law.</p>
            </Sub>
            <Sub title="6.3 Responsibility">
              <p>You remain solely responsible for:</p>
              <List items={['the legality of your content','any consequences arising from its use']} />
              <p>KiN-TXT does not monitor content proactively and does not accept liability for user content.</p>
            </Sub>
            <Sub title="6.4 Enforcement">
              <p>We may:</p>
              <List items={['remove or restrict content','suspend or terminate accounts']} />
              <p>…where infringement or risk is identified.</p>
            </Sub>
            <Sub title="6.5 No Tolerance for Objectionable Content or Abuse">
              <p>There is zero tolerance for objectionable, abusive, harassing, hateful, or otherwise inappropriate content or behaviour. By using the social features ("KiNs", clubs, profiles and sharing) you agree not to post or send such content and to treat other users with respect.</p>
              <p>You can report objectionable content or users, and block any user, directly from their profile within the app. Reports are reviewed and acted on (including removing content and ejecting offending users) within 24 hours. To report abuse you may also contact us at <a href="mailto:support@kin-txt.com" className="underline">support@kin-txt.com</a>.</p>
            </Sub>
          </Section>

          <Section number="7" title="Intellectual Property">
            <p>All rights in the Service — including software, design, interface, and kinetic reading engine — are owned by KiN-TXT or its licensors.</p>
            <p>You are granted a limited, non-transferable, revocable licence to use the Service.</p>
            <p>You may not copy, modify, distribute, or commercially exploit any part of KiN-TXT without permission.</p>
          </Section>

          <Section number="8" title="Third-Party Content">
            <p>KiN-TXT may display or provide access to third-party content. We do not control or endorse such content and do not guarantee its accuracy, legality, or availability.</p>
            <p>Your interaction with third-party content is at your own risk.</p>
          </Section>

          <Section number="9" title="Service Availability">
            <p>The Service is provided on an "as is" and "as available" basis.</p>
            <p>KiN-TXT does not guarantee:</p>
            <List items={['uninterrupted access','error-free operation','data preservation','compatibility across devices']} />
            <p>To the fullest extent permitted by law, KiN-TXT disclaims all warranties, whether express or implied, including fitness for a particular purpose.</p>
            <p>We may update, modify, suspend, or discontinue any part of the Service at any time.</p>
          </Section>

          <Section number="10" title="Data and Loss">
            <p>You acknowledge that:</p>
            <List items={['digital systems may fail','data may be lost or corrupted']} />
            <p>KiN-TXT is not responsible for loss of user content or failure to store or retrieve data.</p>
            <p>You are responsible for maintaining your own copies where necessary.</p>
          </Section>

          <Section number="11" title="Limitation of Liability">
            <p>To the fullest extent permitted by law, KiN-TXT shall not be liable for:</p>
            <List items={['indirect, incidental, or consequential loss','loss of profits, revenue, data, or opportunity','claims arising from user or third-party content']} />
            <p>Total liability for any claim shall not exceed the amount you paid to KiN-TXT in the previous 12 months.</p>
            <p>Nothing in these Terms excludes or limits liability for:</p>
            <List items={['death or personal injury caused by negligence','fraud or fraudulent misrepresentation','any liability that cannot be excluded under applicable law']} />
            <p>Your statutory rights as a consumer are not affected.</p>
          </Section>

          <Section number="12" title="Indemnity">
            <p>You agree to indemnify and hold harmless KiN-TXT from any claims, damages, or liabilities arising from:</p>
            <List items={['your use of the Service','your content','your breach of these Terms']} />
          </Section>

          <Section number="13" title="Termination">
            <p>We may suspend or terminate your access immediately and without notice where these Terms are breached or misuse or risk is identified.</p>
            <p>You may stop using the Service at any time.</p>
          </Section>

          <Section number="14" title="Changes to the Service">
            <p>KiN-TXT may add or remove features, change functionality, or restrict access without liability.</p>
          </Section>

          <Section number="15" title="Changes to Terms">
            <p>We may update these Terms. Where changes are material, we will take reasonable steps to notify users. Continued use constitutes acceptance.</p>
          </Section>

          <Section number="16" title="App Store Terms (Apple & Third Parties)">
            <p>If you access KiN-TXT via the Apple App Store:</p>
            <List items={[
              'Apple is not responsible for the Service or its content',
              'Your use must comply with Apple\'s App Store Terms',
              'Apple has no obligation to provide support',
            ]} />
            <p>In the event of a failure of the Service, you may notify Apple and Apple may refund the purchase where applicable.</p>
            <p>To the maximum extent permitted:</p>
            <List items={['Apple has no warranty obligations','Apple is not liable for claims relating to the Service']} />
            <p>Apple and its subsidiaries are third-party beneficiaries of these Terms.</p>
          </Section>

          <Section number="17" title="Subscriptions & In-App Purchases">
            <p>KiN-TXT offers an optional paid subscription that unlocks additional features.</p>
            <Sub title="17.1 Apple In-App Purchase (iOS)">
              <p>If you subscribe within the iOS app, payment is charged to your Apple ID at confirmation of purchase. The applicable price is shown in the app before you confirm.</p>
              <List items={[
                'Subscriptions renew automatically unless auto-renew is turned off at least 24 hours before the end of the current period',
                'Your Apple ID account is charged for renewal within 24 hours prior to the end of the current period',
                'You can manage or cancel your subscription, and turn off auto-renew, in your device Settings under your Apple ID',
                'Any unused portion of a free trial is forfeited when you purchase a subscription',
              ]} />
              <p>Purchases made through Apple are subject to Apple&apos;s terms; refunds for App Store purchases are handled by Apple.</p>
            </Sub>
            <Sub title="17.2 Web (Stripe)">
              <p>If you subscribe via our website, billing is handled by Stripe and is governed by our Payment Policy.</p>
            </Sub>
          </Section>

          <Section number="18" title="Account Deletion">
            <p>You may permanently delete your account at any time from within the app via <span className="text-foreground">Account &amp; Settings → Delete account</span>, or by contacting us.</p>
            <p>Deleting your account removes your profile, saved texts, reading progress, and connections, except where retention is required by law. Deleting your account does not automatically cancel an active App Store subscription — you must cancel that separately in your device Settings.</p>
          </Section>

          <Section number="19" title="Governing Law">
            <p>These Terms are governed by the laws of England and Wales. You agree to the exclusive jurisdiction of its courts.</p>
          </Section>

          <Section number="20" title="Consumer Rights">
            <p>If you are a consumer, you have certain rights under UK law in relation to digital services. Nothing in these Terms affects those rights. Where the Service is found not to meet legal standards, remedies may be available in accordance with applicable law.</p>
          </Section>

          <Section number="21" title="Events Outside Our Control">
            <p>KiN-TXT is not liable for failure or delay in performance caused by events outside our reasonable control, including:</p>
            <List items={['infrastructure failure','network outages','third-party service disruption','natural events or emergencies']} />
          </Section>

          <Section number="22" title="Contact">
            <p><a href="mailto:hello@kin-txt.com" className="text-foreground underline underline-offset-2">hello@kin-txt.com</a></p>
          </Section>
        </motion.div>
      </div>
    </div>
  );
}
