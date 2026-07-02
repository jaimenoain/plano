import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from 'plano';

const body: React.CSSProperties = { color: 'var(--text-secondary)', lineHeight: 1.6 };

export const FAQ = () => (
  <Accordion type="single" collapsible defaultValue="attribution" style={{ maxWidth: 460 }}>
    <AccordionItem value="attribution">
      <AccordionTrigger>How is an architect attributed to a building?</AccordionTrigger>
      <AccordionContent>
        <p style={body}>
          Attribution follows primary sources — commissioning records, published plans, and
          archival correspondence. Community submissions remain marked unverified until a
          curator confirms them against a citation.
        </p>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="status">
      <AccordionTrigger>What do the construction statuses mean?</AccordionTrigger>
      <AccordionContent>
        <p style={body}>
          Buildings are tagged Extant, Under construction, Lost, Unbuilt, or Temporary. Lost
          and Unbuilt records appear as faded, dashed pins on the map.
        </p>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="photography">
      <AccordionTrigger>Can I submit my own photography?</AccordionTrigger>
      <AccordionContent>
        <p style={body}>
          Yes. Contributors may upload plates and elevations to any record. Uploads enter a
          review queue and are credited on publication.
        </p>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export const Multiple = () => (
  <Accordion type="multiple" defaultValue={['helsinki', 'oslo']} style={{ maxWidth: 460 }}>
    <AccordionItem value="helsinki">
      <AccordionTrigger>Helsinki — 214 buildings</AccordionTrigger>
      <AccordionContent>
        <p style={body}>Finlandia Hall, Kiasma, and the Rautatalo office block.</p>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="oslo">
      <AccordionTrigger>Oslo — 138 buildings</AccordionTrigger>
      <AccordionContent>
        <p style={body}>The Opera House, Deichman Bjørvika, and the National Museum.</p>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);
