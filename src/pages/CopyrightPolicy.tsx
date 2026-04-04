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

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc list-inside space-y-1 mt-1">{items.map(i => <li key={i}>{i}</li>)}</ul>
);

export default function CopyrightPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <ThemeToggle />
      <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate(-1)}
        className="absolute left-4 z-50 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <ArrowLeft className="w-4 h-4" /> Back
      </motion.button>
      <div className="flex-1 max-w-2xl mx-auto px-6 pt-20 pb-16 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">KiN-TXT</p>
          <h1 className="font-display text-4xl tracking-wide text-foreground mb-2">Copyright Policy</h1>
          <p className="text-xs text-muted-foreground mb-10">Last updated: April 2026</p>

          <Section number="1" title="Platform Position">
            <p>KiN-TXT is a reading interface. It provides tools for interacting with text but does not act as a publisher, editor, or distributor of original works. KiN-TXT does not create, verify, or assume responsibility for the legality, accuracy, or ownership of content accessed through the platform. KiN-TXT operates as a passive intermediary in relation to user-submitted content.</p>
          </Section>

          <Section number="2" title="Public Domain Content">
            <p>KiN-TXT may include texts sourced from public domain repositories (e.g. Project Gutenberg). These works are free of copyright restrictions and are reformatted solely for kinetic presentation. No ownership is claimed over public domain materials.</p>
          </Section>

          <Section number="3" title="Open-Licence Content">
            <p>KiN-TXT may display content made available under open licences (e.g. Global Voices). Such content is used in accordance with the applicable licence terms. Where required, attribution is provided and licence conditions are respected. KiN-TXT does not modify the wording or meaning of such content.</p>
          </Section>

          <Section number="4" title="Presentation Layer">
            <p>KiN-TXT modifies the visual and temporal presentation of text, including timing, rhythm, and positioning. These transformations are applied solely to enable the functionality of the reading interface. KiN-TXT does not edit, rewrite, or alter the underlying textual content.</p>
          </Section>

          <Section number="5" title="User-Uploaded Content">
            <p>Users may upload text for private use within KiN-TXT. KiN-TXT:</p>
            <List items={['does not make uploaded content publicly searchable or discoverable','does not promote or distribute uploaded content','does not monitor content proactively']} />
            <p className="mt-2">By uploading content, you represent and warrant that you own the content or have the necessary rights to use it and that your use complies with applicable laws. Users remain solely responsible for the legality of their content and any consequences arising from its use. KiN-TXT accepts no liability for user-uploaded content.</p>
          </Section>

          <Section number="6" title="Notice and Takedown Procedure">
            <p>If you believe content available through KiN-TXT infringes your copyright, you may submit a notice including:</p>
            <List items={['identification of the copyrighted work claimed to be infringed','identification of the material claimed to be infringing','sufficient information to locate the material within the Service','your name and contact details','a statement that you have a good faith belief that the use is not authorised','a statement that the information provided is accurate']} />
            <p className="mt-2">Upon receipt of a valid notice, KiN-TXT will review the claim and remove or disable access to the content where appropriate. KiN-TXT reserves the right to reject notices that are incomplete, inaccurate, or submitted in bad faith.</p>
          </Section>

          <Section number="7" title="Counter-Notice Procedure">
            <p>If you believe content was removed or restricted in error, you may submit a counter-notice including identification of the content removed, a statement explaining why the removal was incorrect, and your contact details. KiN-TXT may review the counter-notice and, where appropriate, restore access to the content at its discretion.</p>
          </Section>

          <Section number="8" title="Repeat Infringement">
            <p>KiN-TXT maintains a policy for terminating accounts of repeat infringers. Users who repeatedly submit infringing content or violate copyright laws may have their accounts suspended, restricted, or permanently removed.</p>
          </Section>

          <Section number="9" title="No Monitoring Obligation">
            <p>KiN-TXT does not monitor user content proactively, verify ownership or rights, or screen or review content prior to processing. The platform operates on a reactive basis in response to valid legal notices.</p>
          </Section>

          <Section number="10" title="Limitation of Responsibility">
            <p>KiN-TXT is not responsible for user-uploaded content, the accuracy or legality of content, or actions taken by users in relation to content. All content is accessed and used at the user's own risk.</p>
          </Section>

          <Section number="11" title="International Compliance">
            <p>KiN-TXT aims to comply with applicable copyright frameworks, including principles reflected in the Digital Millennium Copyright Act (DMCA), while operating under the laws of England and Wales. Nothing in this policy limits any rights or obligations under applicable law.</p>
          </Section>

          <Section number="12" title="Contact">
            <p><a href="mailto:hello@kin-txt.com" className="text-foreground underline underline-offset-2">hello@kin-txt.com</a></p>
          </Section>
        </motion.div>
      </div>
    </div>
  );
}
