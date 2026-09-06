export interface SubExpertise {
  id: string;
  name: string;
  description: string;
  typicalDeliverables: string[];
}

export interface TechServiceCategory {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  description?: string;
  badge?: string;
  iconName: string;
  tagline: string;
  subExpertise: SubExpertise[];
  sampleRequirements: string[];
}

export const TECH_SERVICE_CATEGORIES: TechServiceCategory[] = [
  {
    id: 'ai-ecosystem',
    title: 'Artificial Intelligence',
    tagline: 'Custom AI agents, automations, LLM integration & data models',
    shortDescription: 'From bespoke generative AI products to machine learning pipelines and prompt architecture.',
    fullDescription: 'Harness the frontier of generative AI, specialized fine-tuning, intelligent agent workflows, and predictive machine learning models tailored to your exact business operations.',
    iconName: 'Sparkles',
    subExpertise: [
      {
        id: 'ai-dev',
        name: 'AI Development',
        description: 'End-to-end engineering of proprietary AI applications, neural models, and algorithmic pipelines.',
        typicalDeliverables: ['Custom AI Backend', 'Model Integration', 'Evaluation Harness', 'Production Deployment']
      },
      {
        id: 'ai-integration',
        name: 'AI Integration',
        description: 'Connecting Gemini, OpenAI, Claude, or open-weight models into your existing applications and CRMs.',
        typicalDeliverables: ['API Bridges', 'Function Calling Workflows', 'Token Optimization', 'Context Window Caching']
      },
      {
        id: 'ai-automation',
        name: 'AI Automation',
        description: 'Autonomous multi-agent workflows, data processing loops, and intelligent document extraction.',
        typicalDeliverables: ['Agent Orchestration', 'Document Parsers', 'Webhook Triggers', 'Zero-Human-In-Loop Pipes']
      },
      {
        id: 'machine-learning',
        name: 'Machine Learning',
        description: 'Supervised/unsupervised training, predictive scoring, computer vision, and recommendation engines.',
        typicalDeliverables: ['Trained Weights & Pickles', 'Validation Report', 'Inference Microservice', 'Feature Pipeline']
      },
      {
        id: 'generative-ai',
        name: 'Generative AI',
        description: 'Custom multimodal generators, text synthesizers, voice agents, and creative generative suites.',
        typicalDeliverables: ['Multimodal Pipelines', 'Prompt Schemas', 'Streaming UI Components', 'Safety Filters']
      },
      {
        id: 'prompt-engineering',
        name: 'Prompt Engineering',
        description: 'Rigorous few-shot instruction design, system prompt auditing, chain-of-thought, and guardrails.',
        typicalDeliverables: ['Hardened System Prompts', 'Evaluation Test Cases', 'JSON Schema Blueprints', 'Latency Tuning']
      },
      {
        id: 'ai-product-dev',
        name: 'AI Product Development',
        description: 'Full lifecycle conception, technical architecture, and implementation of AI-first SaaS platforms.',
        typicalDeliverables: ['Product Architecture', 'Interactive MVP', 'User Feedback Loops', 'Scalable Inference Infra']
      }
    ],
    sampleRequirements: ['Custom AI Chatbot', 'Document Extraction Agent', 'Automated Customer Support Pipeline', 'Multimodal Image Analysis', 'Recommendation Engine']
  },
  {
    id: 'web-software',
    title: 'Web & Software Development',
    tagline: 'Modern responsive web applications, enterprise software & scalable APIs',
    shortDescription: 'Full-stack engineering, custom software systems, interactive web portals, and microservices.',
    fullDescription: 'Production-ready web development, resilient backend distributed systems, REST/GraphQL APIs, and enterprise cloud software engineered for performance, security, and scale.',
    iconName: 'Code2',
    subExpertise: [
      {
        id: 'frontend-dev',
        name: 'Frontend Development',
        description: 'High-performance, accessible, and reactive user interfaces built with React, Vue, Next.js, and TypeScript.',
        typicalDeliverables: ['Component Systems', 'Responsive Views', 'State Management', 'Micro-interactions']
      },
      {
        id: 'backend-dev',
        name: 'Backend Development',
        description: 'Scalable server architecture, robust relational/NoSQL databases, authentication, and caching.',
        typicalDeliverables: ['Server Endpoints', 'Database Schema', 'Authentication / RBAC', 'Rate Limiting']
      },
      {
        id: 'fullstack-dev',
        name: 'Full Stack Development',
        description: 'Turnkey development bridging interactive client experiences with dependable server engines.',
        typicalDeliverables: ['Complete Web Application', 'Deployment Setup', 'Database Migration', 'Documentation']
      },
      {
        id: 'website-dev',
        name: 'Website Development',
        description: 'Corporate websites, high-converting product showcases, CMS portals, and e-commerce platforms.',
        typicalDeliverables: ['SEO-Optimized Site', 'Content Management', 'Analytics Setup', 'Mobile Responsive Layouts']
      },
      {
        id: 'web-apps',
        name: 'Web Applications',
        description: 'Complex SaaS portals, operational dashboards, workflow management tools, and collaborative apps.',
        typicalDeliverables: ['Role-Based Dashboards', 'Live Data Views', 'Export & Reporting Tools', 'Security Audits']
      },
      {
        id: 'api-dev',
        name: 'API Development',
        description: 'High-throughput RESTful and GraphQL APIs, webhook infrastructures, and external service connectors.',
        typicalDeliverables: ['OpenAPI / Swagger Specs', 'SDK Boilerplates', 'Authentication Tokens', 'Webhook Listeners']
      },
      {
        id: 'software-eng',
        name: 'Software Engineering',
        description: 'Custom internal utilities, system integrations, background workers, and business logic automation.',
        typicalDeliverables: ['Compiled Packages', 'Unit & E2E Test Suites', 'CI/CD Pipelines', 'Architecture Blueprint']
      }
    ],
    sampleRequirements: ['Responsive Business Website', 'E-commerce Store with Payment Gateway', 'Customer Portal & Dashboard', 'Custom SaaS Platform', 'REST API Architecture']
  },
  {
    id: 'mobile-dev',
    title: 'Mobile Development',
    tagline: 'Native iOS & Android apps, cross-platform Flutter & React Native solutions',
    shortDescription: 'High-polish mobile apps crafted for smooth device performance, offline storage, and app store release.',
    fullDescription: 'From concept and touch-optimized UI to app store publication, create seamless mobile applications across smartphones and tablets with push notifications, offline cache, and native hardware integration.',
    iconName: 'Smartphone',
    subExpertise: [
      {
        id: 'android-dev',
        name: 'Android Development',
        description: 'Native Kotlin and Jetpack Compose applications optimized across Android versions and device form factors.',
        typicalDeliverables: ['APK / AAB Packages', 'Material You UI', 'Background Sync Services', 'Play Store Readiness']
      },
      {
        id: 'ios-dev',
        name: 'iOS Development',
        description: 'Native Swift and SwiftUI applications delivering fluid iOS experiences adhering to Apple Human Interface Guidelines.',
        typicalDeliverables: ['Xcode Project', 'SwiftUI Architecture', 'In-App Purchases', 'TestFlight Builds']
      },
      {
        id: 'flutter-dev',
        name: 'Flutter Development',
        description: 'Fast, single-codebase cross-platform mobile apps for iOS and Android with unified styling.',
        typicalDeliverables: ['Cross-platform Codebase', 'Custom Widgets', 'State Management (Riverpod/Bloc)', 'Compiled Apps']
      },
      {
        id: 'react-native',
        name: 'React Native',
        description: 'Modern mobile engineering using React, Expo, and TypeScript for rapid cross-platform velocity.',
        typicalDeliverables: ['Expo / Bare RN App', 'Native Bridge Modules', 'OTA Update Configuration', 'Store Assets']
      },
      {
        id: 'cross-platform',
        name: 'Cross-platform Applications',
        description: 'Multi-device solutions unifying mobile, tablet, and responsive web experiences with shared state.',
        typicalDeliverables: ['Shared Business Logic', 'Adaptive Tablet Formats', 'Offline SQLite/KV Sync', 'Push Notifications']
      }
    ],
    sampleRequirements: ['Consumer Mobile App', 'Delivery / Logistics Mobile Tracking', 'Field Operations Mobile Portal', 'Fintech Wallet App', 'Offline-First Tablet Tool']
  },
  {
    id: 'cloud-devops',
    title: 'Cloud & DevOps',
    tagline: 'Reliable cloud infrastructure, CI/CD automation & high-availability servers',
    shortDescription: 'Google Cloud, AWS, automated deployment pipelines, Docker containerization, and database ops.',
    fullDescription: 'Architect resilient, scalable, and cost-efficient cloud foundations. We configure continuous deployment, automated backups, load balancing, and container orchestration to keep your platforms running 24/7.',
    iconName: 'Cloud',
    subExpertise: [
      {
        id: 'cloud-eng',
        name: 'Cloud Engineering',
        description: 'Architecting scalable serverless and compute infrastructure on GCP, AWS, and modern cloud providers.',
        typicalDeliverables: ['Infrastructure Architecture', 'VPC & Networking Setup', 'IAM Security Policies', 'Cost Optimization']
      },
      {
        id: 'cloud-arch',
        name: 'Cloud Architecture',
        description: 'High-level systems design for distributed microservices, failover redundancy, and global availability.',
        typicalDeliverables: ['System Architecture Diagram', 'Disaster Recovery Plan', 'Capacity Planning', 'SLA Framework']
      },
      {
        id: 'devops',
        name: 'DevOps & CI/CD',
        description: 'Automating build, test, and release cycles with GitHub Actions, GitLab CI, and deployment webhooks.',
        typicalDeliverables: ['Automated CI/CD Workflows', 'Release Tags & Rollbacks', 'Environment Secrets Vault', 'Linter Gates']
      },
      {
        id: 'server-infra',
        name: 'Server Infrastructure',
        description: 'Provisioning, monitoring, and maintaining Linux production servers, Nginx reverse proxies, and SSL.',
        typicalDeliverables: ['Hardened Server Image', 'Nginx Configs', 'Auto-renewing SSL Certificates', 'Systemd Services']
      },
      {
        id: 'deployment',
        name: 'Deployment & Containers',
        description: 'Docker containerization, Kubernetes orchestration, Cloud Run setups, and zero-downtime rolling releases.',
        typicalDeliverables: ['Dockerfile & Compose', 'Container Registry Setup', 'Zero-Downtime Rollouts', 'Health Check Probes']
      },
      {
        id: 'db-infra',
        name: 'Database Infrastructure',
        description: 'High-reliability setup and optimization for PostgreSQL, Cloud SQL, MongoDB, Redis, and Firestore.',
        typicalDeliverables: ['Database Replication', 'Automated Daily Backups', 'Index Optimization', 'Connection Pooling']
      }
    ],
    sampleRequirements: ['Cloud Migration from Shared Hosting', 'CI/CD Pipeline Setup', 'PostgreSQL High-Availability Cluster', 'Dockerizing Legacy App', 'Cloud Run & Nginx Setup']
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity',
    tagline: 'Vulnerability assessment, security hardening & compliance consulting',
    shortDescription: 'Protect your applications, customer data, and cloud infrastructure against unauthorized breaches.',
    fullDescription: 'Safeguard your digital assets with enterprise-grade defensive practices: penetration testing, dependency audits, OWASP top-10 mitigation, encryption protocols, and zero-trust authentication policies.',
    iconName: 'ShieldAlert',
    subExpertise: [
      {
        id: 'app-sec',
        name: 'Application Security',
        description: 'Auditing codebases for injection vulnerabilities, cross-site scripting (XSS), CSRF, and authorization gaps.',
        typicalDeliverables: ['Vulnerability Scan Report', 'Code Fix Patches', 'Sanitization Libraries', 'Security Checklist']
      },
      {
        id: 'sec-assessment',
        name: 'Security Assessment',
        description: 'Thorough penetration testing of web applications, public API endpoints, and server infrastructure.',
        typicalDeliverables: ['Executive Summary', 'Technical Findings Log', 'Risk Severity Matrix', 'Remediation Roadmap']
      },
      {
        id: 'sec-consulting',
        name: 'Cybersecurity Consulting',
        description: 'Strategic advisory on NDPR/GDPR compliance, data privacy, incident response, and security governance.',
        typicalDeliverables: ['Security Policy Manual', 'Incident Response Playbook', 'Compliance Gap Analysis', 'Staff Best Practices']
      },
      {
        id: 'infra-security',
        name: 'Infrastructure Security',
        description: 'Firewall rules, SSH bastion hosts, DDoS mitigation, rate-limiting, and network isolation.',
        typicalDeliverables: ['Cloud Armor / WAF Rules', 'Intrusion Detection Setup', 'Secrets Vault Setup', 'Access Audit Logs']
      }
    ],
    sampleRequirements: ['Web Application Penetration Test', 'API Security Audit & Remediation', 'Data Protection & Privacy Policy', 'DDoS Protection & Firewall Config', 'PCI-DSS Payment Compliance Check']
  },
  {
    id: 'ui-ux-design',
    title: 'UI/UX & Product Design',
    tagline: 'Intuitive user journeys, design systems & high-fidelity interactive prototypes',
    shortDescription: 'User-centered design that turns complex digital workflows into clean, memorable, and elegant user interfaces.',
    fullDescription: 'From initial customer journey mapping and low-fidelity wireframes to pixel-perfect Figma design systems and interactive prototypes, we design digital products that users love.',
    iconName: 'Layout',
    subExpertise: [
      {
        id: 'ui-design',
        name: 'UI Design',
        description: 'Pixel-perfect visual design, typography pairing, aesthetic spacing, visual hierarchy, and polished controls.',
        typicalDeliverables: ['High-Fidelity Figma Files', 'Responsive Desktop/Mobile Layouts', 'Icon Sets & Assets', 'Color Tokens']
      },
      {
        id: 'ux-design',
        name: 'UX Design',
        description: 'User personas, empathy maps, task flow diagrams, information architecture, and usability testing.',
        typicalDeliverables: ['User Flow Maps', 'Information Architecture', 'Usability Findings Report', 'Wireframe Blueprints']
      },
      {
        id: 'product-design',
        name: 'Product Design',
        description: 'Comprehensive product discovery, feature scoping, monetization UX, and product-market fit design.',
        typicalDeliverables: ['Product Spec Document', 'Core Loop Wireframes', 'Feature Matrix', 'Interactive Prototype']
      },
      {
        id: 'wireframing',
        name: 'Wireframing',
        description: 'Rapid structural drafting to align stakeholders on layout and content before investing in visual styling.',
        typicalDeliverables: ['Low-Fidelity Screen Flows', 'Content Skeletons', 'Clickable Wireframes', 'Feedback Iteration']
      },
      {
        id: 'prototyping',
        name: 'Prototyping',
        description: 'Realistic clickable and animated Figma prototypes simulating real software behavior for testing.',
        typicalDeliverables: ['Interactive Figma Prototype', 'Micro-interaction Specs', 'User Testing Video Recordings', 'Developer Notes']
      },
      {
        id: 'design-systems',
        name: 'Design Systems',
        description: 'Scalable reusable UI components, variants, design tokens, and documentation for product teams.',
        typicalDeliverables: ['Atomic Component Library', 'Token Tokens (CSS/Tailwind)', 'Typography System', 'Usage Guidelines']
      }
    ],
    sampleRequirements: ['Figma Design for Mobile App', 'Complete SaaS Dashboard UI Redesign', 'Design System & Component Library', 'E-commerce Checkout Flow UX Audit', 'Clickable Prototype for Investor Pitch']
  },
  {
    id: 'graphics-branding',
    title: 'Graphics & Branding',
    tagline: 'Distinctive brand identities, logos, marketing assets & visual communication',
    shortDescription: 'Build a trustworthy, modern, and memorable brand identity that stands out in any market.',
    fullDescription: 'We help businesses establish a cohesive visual presence that conveys prestige and credibility. From timeless logo marks and typography guidelines to social templates and marketing collateral.',
    iconName: 'Palette',
    subExpertise: [
      {
        id: 'logo-design',
        name: 'Logo Design',
        description: 'Distinctive, memorable, and vector-perfect logo marks, wordmarks, and responsive brand symbols.',
        typicalDeliverables: ['Vector Assets (SVG, EPS, PNG)', 'Monochrome & Dark Mode Variations', 'Favicon & App Icon Formats', 'Logo Usage Rules']
      },
      {
        id: 'brand-identity',
        name: 'Brand Identity',
        description: 'Holistic visual identities encompassing color palettes, typography rules, brand tone, and design language.',
        typicalDeliverables: ['Comprehensive Brand Guidelines PDF', 'Color Palette Swatches', 'Font Licencing Guide', 'Brand Storyboard']
      },
      {
        id: 'graphic-design',
        name: 'Graphic Design',
        description: 'Marketing banners, social media assets, event collateral, product packaging, and presentation decks.',
        typicalDeliverables: ['High-Resolution Print Files', 'Digital Social Templates', 'Pitch Deck Slides', 'Vector Illustrations']
      },
      {
        id: 'brand-strategy',
        name: 'Brand Strategy',
        description: 'Market positioning, competitor differentiation analysis, value proposition crafting, and brand voice.',
        typicalDeliverables: ['Brand Positioning Document', 'Audience Archetypes', 'Messaging Pillars', 'Tone of Voice Guide']
      },
      {
        id: 'visual-identity',
        name: 'Visual Identity',
        description: 'Consistent visual systems across all company touchpoints: stationery, uniforms, digital ads, and signage.',
        typicalDeliverables: ['Stationery Mockups', 'Social Banner Kits', 'Email Signature Templates', 'Merchandise Vectors']
      }
    ],
    sampleRequirements: ['Complete Brand Identity & Logo Package', 'Investor Pitch Deck Presentation', 'Social Media Branding Kit', 'Product Packaging & Label Design', 'Corporate Rebranding Guidelines']
  },
  {
    id: 'data-analytics',
    title: 'Data & Analytics',
    tagline: 'Business intelligence, data pipelines, interactive dashboards & predictive models',
    shortDescription: 'Turn raw operational and customer data into clear, actionable business insights and revenue drivers.',
    fullDescription: 'Harness the power of your business data. We design ETL pipelines, automated reporting dashboards, customer segmentation models, and executive metrics views that drive smart strategic decisions.',
    iconName: 'BarChart3',
    subExpertise: [
      {
        id: 'data-analysis',
        name: 'Data Analysis',
        description: 'Exploratory data analysis, cohort analysis, conversion funnel auditing, and financial metrics modeling.',
        typicalDeliverables: ['Actionable Insights Report', 'Cleaned Dataset', 'Key Performance Indicator (KPI) Summary', 'Executive Presentation']
      },
      {
        id: 'data-eng',
        name: 'Data Engineering',
        description: 'Extract, transform, and load (ETL) pipelines moving data reliably into modern warehouses (BigQuery/Postgres).',
        typicalDeliverables: ['Automated ETL Pipeline', 'Data Warehouse Schema', 'Data Quality Checkers', 'Scheduled Data Syncs']
      },
      {
        id: 'bi',
        name: 'Business Intelligence',
        description: 'Centralized single-source-of-truth BI models consolidating marketing, sales, and inventory data.',
        typicalDeliverables: ['Interactive Looker / PowerBI Dashboards', 'Self-Serve Report Models', 'Automated Email Digests', 'Metric Dictionaries']
      },
      {
        id: 'data-viz',
        name: 'Data Visualization',
        description: 'Custom interactive D3.js and Recharts visualizations embedded into web apps and customer portals.',
        typicalDeliverables: ['Embedded React Chart Components', 'Dynamic Filter Controls', 'Export to PDF/CSV Tools', 'Interactive Drill-downs']
      }
    ],
    sampleRequirements: ['Executive Sales & Revenue Dashboard', 'Customer Retention & Churn Analysis', 'Automated BigQuery Pipeline', 'Embedded Analytics in Customer Portal', 'Inventory Forecasting Model']
  },
  {
    id: 'digital-marketing',
    title: 'Digital Marketing',
    tagline: 'Performance growth, search engine optimization, content funnels & paid campaigns',
    shortDescription: 'Reach qualified customers, expand brand visibility, and scale customer acquisition sustainably.',
    fullDescription: 'Modern digital growth strategies designed to bring real paying customers to your digital products. We execute technical SEO, performance advertising campaigns, content strategies, and conversion rate optimization.',
    iconName: 'TrendingUp',
    subExpertise: [
      {
        id: 'seo',
        name: 'Search Engine Optimization (SEO)',
        description: 'Technical audits, on-page optimization, keyword clustering, structured data, and authoritative backlinks.',
        typicalDeliverables: ['Technical SEO Audit & Fixes', 'Keyword Strategy Map', 'Schema Markup Integration', 'Rank Tracking Setup']
      },
      {
        id: 'content-strategy',
        name: 'Content Strategy',
        description: 'Topic cluster architecture, editorial calendars, lead magnets, and customer journey content mapping.',
        typicalDeliverables: ['90-Day Editorial Calendar', 'Content Briefs & Keywords', 'Lead Magnet Funnel', 'Distribution Plan']
      },
      {
        id: 'social-media',
        name: 'Social Media Strategy',
        description: 'Platform-specific content playbooks, brand storytelling, organic growth loops, and influencer outreach.',
        typicalDeliverables: ['Social Playbook', 'Monthly Content Templates', 'Engagement Protocol', 'Performance KPI Tracker']
      },
      {
        id: 'growth-strategy',
        name: 'Growth Strategy',
        description: 'Experimentation frameworks, viral referral mechanics, product-led growth loops, and churn reduction.',
        typicalDeliverables: ['Growth Funnel Audit', 'A/B Testing Roadmap', 'Referral Loop Mechanics', 'Conversion Rate Optimization Plan']
      },
      {
        id: 'digital-ads',
        name: 'Digital Advertising',
        description: 'Targeted Google Search, Meta, and LinkedIn ad campaigns with rigorous conversion tracking and ROI optimization.',
        typicalDeliverables: ['Ad Account Setup', 'Custom Audience Targeting', 'High-Converting Ad Creatives', 'ROAS Tracking Dashboard']
      }
    ],
    sampleRequirements: ['Technical SEO Audit & Search Ranking Strategy', 'Paid Ad Campaign Launch & ROAS Setup', 'Complete Content Marketing Funnel', 'Conversion Rate Optimization Audit', 'Product Launch Growth Playbook']
  },
  {
    id: 'writing-content',
    title: 'Writing & Content',
    tagline: 'Technical documentation, whitepapers, executive ghostwriting & high-converting copy',
    shortDescription: 'Clear, authoritative, and persuasive written communication engineered for tech and digital businesses.',
    fullDescription: 'Words shape credibility. We craft developer-grade API documentation, deep-dive whitepapers, executive ghostwriting for founders, engaging blog posts, and landing page copy that drives conversions.',
    iconName: 'FileText',
    subExpertise: [
      {
        id: 'technical-writing',
        name: 'Technical Writing',
        description: 'API reference manuals, software architecture whitepapers, SDK walkthroughs, and developer tutorials.',
        typicalDeliverables: ['Markdown / Mintlify Docs', 'API Reference Guides', 'Quickstart Tutorials', 'Code Walkthroughs']
      },
      {
        id: 'ghostwriting',
        name: 'Ghostwriting',
        description: 'Thought leadership articles, LinkedIn thought leadership, books, and founder commentary in your authentic voice.',
        typicalDeliverables: ['Polished Long-Form Articles', 'Executive LinkedIn Posts', 'Keynote Speeches', 'Op-Eds']
      },
      {
        id: 'content-writing',
        name: 'Content Writing',
        description: 'In-depth educational articles, case studies, newsletters, and industry reports that build organic authority.',
        typicalDeliverables: ['SEO-Ranked Articles (1500-3000 words)', 'Customer Case Studies', 'Email Newsletters', 'Whitepaper PDFs']
      },
      {
        id: 'copywriting',
        name: 'Copywriting',
        description: 'High-converting website headlines, sales pages, email onboarding sequences, and product descriptions.',
        typicalDeliverables: ['Landing Page Copywire', 'Onboarding Email Drip', 'Microcopy & CTAs', 'Ad Headlines & Body Copy']
      },
      {
        id: 'blogging',
        name: 'Blogging & Articles',
        description: 'Consistent, research-backed industry commentary and product updates that keep your community engaged.',
        typicalDeliverables: ['Bi-Weekly Scheduled Posts', 'Featured Images & Quotes', 'Social Teaser Copy', 'Internal Linking Strategy']
      },
      {
        id: 'documentation',
        name: 'Documentation',
        description: 'Internal company operating procedures (SOPs), knowledge bases, employee playbooks, and user user-guides.',
        typicalDeliverables: ['Structured Knowledge Base', 'Standard Operating Procedures (SOPs)', 'Help Center Articles', 'User Manuals']
      }
    ],
    sampleRequirements: ['Developer API Reference & Documentation Portal', 'Executive Ghostwriting for Founder LinkedIn', 'High-Converting Landing Page Copy', 'In-Depth FinTech Industry Whitepaper', 'Company Standard Operating Procedures (SOPs)']
  }
];

export const BUDGET_RANGES_NGN = [
  '₦50,000 – ₦100,000',
  '₦100,000 – ₦250,000',
  '₦250,000 – ₦500,000',
  '₦500,000 – ₦1,000,000',
  '₦1,000,000+',
  'Custom Budget',
  "Let's Discuss"
];

export const BUDGET_RANGES_USD = [
  '$100 – $250',
  '$250 – $500',
  '$500 – $1,000',
  '$1,000 – $2,500',
  '$2,500+',
  'Custom Budget',
  "Let's Discuss"
];

export const TIMELINE_OPTIONS = [
  'Urgent (ASAP)',
  'Within One Week',
  'Within Two to Four Weeks',
  'Within One to Three Months',
  'Flexible'
];

export const PROJECT_TYPE_OPTIONS = [
  'One-time Project',
  'Short-term Project',
  'Long-term Project',
  'Consultation',
  'Ongoing Support',
  "I'm Not Sure Yet"
];

export const PROJECT_SCOPE_OPTIONS = [
  {
    label: 'Small',
    description: 'Specific feature, landing page, bug resolution, or single asset creation.'
  },
  {
    label: 'Medium',
    description: 'Standard custom application, complete brand identity, or functional MVP.'
  },
  {
    label: 'Large',
    description: 'Comprehensive software platform, multi-platform system, or full-scale overhaul.'
  },
  {
    label: 'Enterprise',
    description: 'High-availability infrastructure, deep compliance, multi-team ecosystem.'
  },
  {
    label: 'Not Sure Yet',
    description: 'Nexovira will help assess the appropriate scope based on your requirements.'
  }
];

export const PROMPT_EXAMPLE_CHIPS = [
  'I need a website for my business',
  'I want to build a mobile application',
  'I need an AI developer',
  'I need a UI/UX designer',
  'I need help with cloud infrastructure',
  'I need someone to design my brand identity',
  'I need a technical writer',
  'I need a cybersecurity expert'
];

