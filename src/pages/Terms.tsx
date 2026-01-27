import { ScrollRestoration } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollRestoration />
      <div className="container mx-auto py-10 px-4 max-w-3xl space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Terms and Conditions for Plano
          </h1>
          <p className="text-muted-foreground">
            <strong>Last Updated:</strong> January 2026
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p>
            Welcome to Plano ("we," "our," or "us"). By accessing or using our website and social platform (the "Service"), you agree to be bound by these Terms and Conditions ("Terms"). If you disagree with any part of these terms, you may not access the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Description of Service</h2>
          <p>
            Plano is a social platform designed for architecture enthusiasts to track visits, rate buildings, organize trips, and interact with friends. The Service is provided "as-is" and may be updated or modified at any time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. User Accounts</h2>
          <p>
            To access certain features of the Service, you must register for an account.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Eligibility:</strong> You must be at least 13 years old to use this Service.
            </li>
            <li>
              <strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your login credentials (email and password). You agree to notify us immediately of any unauthorized use of your account.
            </li>
            <li>
              <strong>Accuracy:</strong> You agree to provide accurate, current, and complete information during the registration process.
            </li>
            <li>
              <strong>Username Generation:</strong> You acknowledge that Plano may automatically generate a username for you based on your email address, which you may be able to modify later depending on platform settings.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. User Conduct</h2>
          <p>You agree not to use the Service to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Post content that is illegal, harmful, threatening, abusive, harassing, defamatory, or hateful.
            </li>
            <li>
              Impersonate any person or entity.
            </li>
            <li>
              Interfere with or disrupt the integrity or performance of the Service.
            </li>
            <li>
              Attempt to gain unauthorized access to the Service or related systems.
            </li>
            <li>
              Use any automated means (bots, scrapers) to access the Service without our permission.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. User-Generated Content</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Ownership:</strong> You retain ownership of the ratings, reviews, lists, and other content you post ("User Content").
            </li>
            <li>
              <strong>License:</strong> By posting User Content, you grant Plano a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display your content in connection with the operation of the Service (e.g., showing your ratings to your friends or on public leaderboards).
            </li>
            <li>
              <strong>Responsibility:</strong> You are solely responsible for your User Content and the consequences of posting it.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Third-Party Data</h2>
          <p>
            This product uses data from various sources. Building metadata, images, and other related information displayed on Plano are provided by OpenStreetMap, Google Places, and user contributions. We do not guarantee the accuracy or completeness of this data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Intellectual Property</h2>
          <p>
            The Service and its original content (excluding User Content and third-party data), features, and functionality are and will remain the exclusive property of Plano. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Plano.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Limitation of Liability</h2>
          <p>
            In no event shall Plano, its developers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">10. Privacy</h2>
          <p>
            Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of information as detailed in our Privacy Policy, including the tracking of your building visits for the purpose of providing social features.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">11. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">12. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at: <a href="mailto:support@cineforum.eu" className="text-primary hover:underline">support@cineforum.eu</a>
          </p>
        </section>
      </div>
    </div>
  );
}
