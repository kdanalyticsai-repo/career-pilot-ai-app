"""Realistic mock job data for development/testing."""

SEED_JOBS = [
    {
        "title": "Senior Backend Engineer",
        "company": "Razorpay",
        "location": "Bangalore",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "senior",
        "salary_min": 2500000,
        "salary_max": 4000000,
        "skills_required": ["Python", "FastAPI", "PostgreSQL", "Redis", "Kafka", "Docker", "Kubernetes"],
        "requirements": [
            "5+ years of backend development experience",
            "Strong proficiency in Python and FastAPI or Django",
            "Experience with high-throughput systems (10k+ RPS)",
            "Hands-on experience with PostgreSQL and Redis",
            "Familiarity with Kafka or similar message brokers",
        ],
        "description": (
            "Razorpay is looking for a Senior Backend Engineer to join our Payments Infrastructure team. "
            "You will design and build highly scalable payment processing systems that handle millions of transactions daily. "
            "Our stack includes Python (FastAPI), PostgreSQL, Redis, and Kafka running on Kubernetes.\n\n"
            "You will work closely with product and design teams to ship features end-to-end, mentor junior engineers, "
            "and contribute to architectural decisions. We value engineers who write clean, testable code and care deeply about reliability."
        ),
    },
    {
        "title": "Machine Learning Engineer",
        "company": "Swiggy",
        "location": "Bangalore",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 2000000,
        "salary_max": 3500000,
        "skills_required": ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "SQL", "Spark", "MLflow"],
        "requirements": [
            "3+ years in ML engineering or applied research",
            "Strong Python skills and experience with TensorFlow or PyTorch",
            "Experience deploying ML models to production",
            "Familiarity with feature stores and MLOps tooling",
            "Solid understanding of statistics and ML fundamentals",
        ],
        "description": (
            "Swiggy's AI/ML team builds recommendation and demand forecasting systems that power food delivery at scale. "
            "As an ML Engineer, you'll train, evaluate, and deploy models that improve order ETA predictions, restaurant rankings, "
            "and personalised recommendations for 50M+ users.\n\n"
            "You'll collaborate with data scientists, backend engineers, and business stakeholders, "
            "and take full ownership from ideation to production."
        ),
    },
    {
        "title": "Full Stack Engineer",
        "company": "CRED",
        "location": "Bangalore",
        "remote_type": "onsite",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 1800000,
        "salary_max": 3000000,
        "skills_required": ["React", "TypeScript", "Node.js", "PostgreSQL", "Redis", "AWS"],
        "requirements": [
            "3+ years full-stack development experience",
            "Strong React and TypeScript skills",
            "Node.js backend development experience",
            "Experience with relational databases",
            "Knowledge of cloud services (AWS preferred)",
        ],
        "description": (
            "CRED is building the future of premium credit card payments. We're looking for a Full Stack Engineer "
            "to join our fintech product team. You'll build features used by India's top credit card users — "
            "from payment flows to reward redemptions.\n\n"
            "Our stack is React + TypeScript on the frontend and Node.js + PostgreSQL on the backend, hosted on AWS."
        ),
    },
    {
        "title": "Data Scientist",
        "company": "Flipkart",
        "location": "Bangalore",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 1800000,
        "salary_max": 3200000,
        "skills_required": ["Python", "Scikit-learn", "SQL", "Spark", "Statistics", "A/B Testing", "Tableau"],
        "requirements": [
            "3+ years in data science or analytics",
            "Strong Python and SQL skills",
            "Experience running A/B tests and interpreting results",
            "Familiarity with Spark for large-scale data processing",
            "Good communication skills to present insights to stakeholders",
        ],
        "description": (
            "Flipkart's Data Science team drives business decisions across supply chain, pricing, and customer experience. "
            "As a Data Scientist, you'll analyse billions of data points to uncover actionable insights, build predictive models, "
            "and run experiments that impact millions of customers.\n\n"
            "You'll partner with product managers and engineers to define metrics, design experiments, and ship data-driven features."
        ),
    },
    {
        "title": "DevOps Engineer",
        "company": "Zepto",
        "location": "Mumbai",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 1600000,
        "salary_max": 2800000,
        "skills_required": ["Kubernetes", "Docker", "Terraform", "AWS", "CI/CD", "Linux", "Python"],
        "requirements": [
            "3+ years of DevOps or SRE experience",
            "Strong Kubernetes and Docker experience",
            "Infrastructure-as-code with Terraform",
            "AWS services (EKS, RDS, S3, CloudFront)",
            "Experience building CI/CD pipelines (GitHub Actions, Jenkins)",
        ],
        "description": (
            "Zepto is a 10-minute grocery delivery startup scaling rapidly. We need a DevOps Engineer to help us "
            "build and maintain the infrastructure powering deliveries in 10+ cities. "
            "You'll manage Kubernetes clusters, automate deployments, and ensure 99.9% uptime.\n\n"
            "This is a high-ownership role — you'll design systems from the ground up and have a direct impact on our growth."
        ),
    },
    {
        "title": "Android Developer",
        "company": "PhonePe",
        "location": "Bangalore",
        "remote_type": "onsite",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 1800000,
        "salary_max": 3000000,
        "skills_required": ["Android", "Kotlin", "Java", "Jetpack Compose", "MVVM", "Coroutines", "REST API"],
        "requirements": [
            "3+ years Android development experience",
            "Proficiency in Kotlin and Jetpack Compose",
            "Experience with MVVM architecture",
            "Knowledge of Coroutines and Flow for async programming",
            "Understanding of payment systems is a plus",
        ],
        "description": (
            "PhonePe processes 5 billion+ transactions annually. Our Android team builds the app used by 500M+ Indians for UPI payments, "
            "insurance, investments, and more. As an Android Developer, you'll work on features that touch millions of users daily.\n\n"
            "We use Jetpack Compose, MVVM, and Kotlin Coroutines. You'll own features end-to-end from design handoff to Play Store release."
        ),
    },
    {
        "title": "Backend Engineer (Python)",
        "company": "Groww",
        "location": "Bangalore",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 1500000,
        "salary_max": 2500000,
        "skills_required": ["Python", "Django", "PostgreSQL", "Redis", "Celery", "Docker", "REST API"],
        "requirements": [
            "2-4 years Python backend development",
            "Experience with Django or FastAPI",
            "Strong PostgreSQL skills",
            "Experience with Redis and Celery for async tasks",
            "Understanding of financial systems is a bonus",
        ],
        "description": (
            "Groww is India's fastest growing investment platform with 10M+ users. We're hiring a Backend Engineer "
            "to build features for mutual funds, stocks, and fixed deposits. You'll work on systems that process "
            "real-time market data, execute orders, and manage user portfolios.\n\n"
            "Stack: Python (Django), PostgreSQL, Redis, Celery, hosted on AWS."
        ),
    },
    {
        "title": "Senior Data Engineer",
        "company": "Meesho",
        "location": "Bangalore",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "senior",
        "salary_min": 2200000,
        "salary_max": 3800000,
        "skills_required": ["Python", "Spark", "Airflow", "SQL", "Kafka", "BigQuery", "dbt"],
        "requirements": [
            "5+ years in data engineering",
            "Strong Apache Spark and PySpark experience",
            "Experience with Airflow for pipeline orchestration",
            "Proficiency with BigQuery or similar data warehouses",
            "Knowledge of dbt for data transformation",
        ],
        "description": (
            "Meesho is building the internet commerce platform for Bharat. Our data team processes petabytes of data "
            "from 150M+ users and 15M+ sellers. As a Senior Data Engineer, you'll design and maintain data pipelines "
            "that power analytics, ML models, and business dashboards.\n\n"
            "You'll work with Spark, Airflow, Kafka, and BigQuery in a highly collaborative environment."
        ),
    },
    {
        "title": "Frontend Engineer (React)",
        "company": "Urban Company",
        "location": "Gurugram",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 1400000,
        "salary_max": 2400000,
        "skills_required": ["React", "TypeScript", "JavaScript", "CSS", "Redux", "REST API", "Git"],
        "requirements": [
            "3+ years frontend development experience",
            "Strong React and TypeScript skills",
            "Experience with state management (Redux or Zustand)",
            "Good eye for design and attention to detail",
            "Familiarity with performance optimisation",
        ],
        "description": (
            "Urban Company is the #1 home services platform in India. Our frontend team builds the consumer and professional "
            "apps used by millions. As a Frontend Engineer, you'll build fast, accessible UIs for booking, payments, and reviews.\n\n"
            "Stack: React + TypeScript, Redux, styled-components."
        ),
    },
    {
        "title": "Site Reliability Engineer",
        "company": "Juspay",
        "location": "Bangalore",
        "remote_type": "remote",
        "job_type": "full_time",
        "experience_level": "senior",
        "salary_min": 2800000,
        "salary_max": 4500000,
        "skills_required": ["Linux", "Kubernetes", "Prometheus", "Grafana", "Python", "Go", "AWS", "Terraform"],
        "requirements": [
            "5+ years SRE or platform engineering experience",
            "Deep Linux and networking knowledge",
            "Experience with Prometheus, Grafana, and alerting",
            "Strong Kubernetes operations experience",
            "Coding ability in Python or Go",
        ],
        "description": (
            "Juspay powers payments for Amazon, Uber, and 100+ enterprises. Our SRE team ensures 99.99% uptime for systems "
            "processing billions of payment requests. As an SRE, you'll own reliability, observability, and incident response.\n\n"
            "This is a fully remote senior role with significant ownership over our infrastructure."
        ),
    },
    {
        "title": "Product Manager - Growth",
        "company": "Nykaa",
        "location": "Mumbai",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 2000000,
        "salary_max": 3500000,
        "skills_required": ["Product Management", "SQL", "Analytics", "A/B Testing", "User Research", "Figma"],
        "requirements": [
            "3+ years product management experience",
            "Strong analytical skills and SQL proficiency",
            "Experience running growth experiments",
            "Ability to work with engineers, designers, and marketing",
            "E-commerce or marketplace experience preferred",
        ],
        "description": (
            "Nykaa is India's leading beauty and fashion platform. Our Growth PM will own user acquisition, activation, "
            "and retention experiments that drive our 30M+ active customer base.\n\n"
            "You'll define product strategy, prioritise the roadmap, run A/B tests, and collaborate with cross-functional teams."
        ),
    },
    {
        "title": "Backend Engineer (Java)",
        "company": "Paytm",
        "location": "Noida",
        "remote_type": "onsite",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 1400000,
        "salary_max": 2400000,
        "skills_required": ["Java", "Spring Boot", "Microservices", "MySQL", "Redis", "Kafka", "Docker"],
        "requirements": [
            "3+ years Java backend development",
            "Strong Spring Boot and microservices experience",
            "MySQL and Redis proficiency",
            "Experience with Kafka for event-driven architecture",
            "Understanding of payment systems is a plus",
        ],
        "description": (
            "Paytm is India's largest digital payments and financial services company. We're hiring a Backend Engineer "
            "for our Wallet and Payments team. You'll build APIs that handle millions of transactions daily.\n\n"
            "Stack: Java (Spring Boot), MySQL, Redis, Kafka, deployed with Docker on our private cloud."
        ),
    },
    {
        "title": "React Native Developer",
        "company": "BrowserStack",
        "location": "Mumbai",
        "remote_type": "remote",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 1800000,
        "salary_max": 3000000,
        "skills_required": ["React Native", "TypeScript", "React", "REST API", "Git", "iOS", "Android"],
        "requirements": [
            "3+ years React Native development",
            "Strong TypeScript and React skills",
            "Experience shipping apps to App Store and Google Play",
            "Knowledge of native iOS/Android modules",
            "Experience with performance profiling",
        ],
        "description": (
            "BrowserStack is the world's leading software testing platform. Our mobile team builds the BrowserStack app "
            "and internal tools used by QA engineers globally. This is a fully remote role.\n\n"
            "Stack: React Native (TypeScript), Expo, with native modules for device interaction."
        ),
    },
    {
        "title": "AI Engineer",
        "company": "Sarvam AI",
        "location": "Bangalore",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "senior",
        "salary_min": 3000000,
        "salary_max": 6000000,
        "skills_required": ["Python", "PyTorch", "LLM", "FastAPI", "Transformers", "CUDA", "MLOps"],
        "requirements": [
            "5+ years ML/AI engineering experience",
            "Deep experience with LLMs and fine-tuning",
            "Strong PyTorch and Transformers library knowledge",
            "Experience serving LLMs at scale",
            "Familiarity with CUDA for GPU optimisation",
        ],
        "description": (
            "Sarvam AI is building India's AI infrastructure — LLMs trained on Indian languages and deployed at scale. "
            "As an AI Engineer, you'll fine-tune large language models, optimise inference pipelines, "
            "and build AI APIs used by enterprises across India.\n\n"
            "This is a high-impact role at the cutting edge of AI research and engineering."
        ),
    },
    {
        "title": "Backend Engineer (Go)",
        "company": "Postman",
        "location": "Bangalore",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "senior",
        "salary_min": 2500000,
        "salary_max": 4200000,
        "skills_required": ["Go", "PostgreSQL", "Redis", "gRPC", "Docker", "Kubernetes", "AWS"],
        "requirements": [
            "5+ years backend development, 2+ years in Go",
            "Experience building high-performance APIs",
            "Strong PostgreSQL and Redis knowledge",
            "gRPC and protobuf experience",
            "Kubernetes operations experience",
        ],
        "description": (
            "Postman is the world's leading API platform with 25M+ developers. Our backend team builds the API management, "
            "collaboration, and testing infrastructure. As a Backend Engineer, you'll work on core platform services in Go.\n\n"
            "We value deep technical ownership, clean code, and building systems that scale globally."
        ),
    },
    {
        "title": "Data Analyst",
        "company": "OYO",
        "location": "Gurugram",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "entry",
        "salary_min": 800000,
        "salary_max": 1400000,
        "skills_required": ["SQL", "Python", "Excel", "Tableau", "Statistics", "Communication"],
        "requirements": [
            "1-3 years in data analysis or business analytics",
            "Strong SQL and Excel skills",
            "Proficiency in Tableau or Power BI",
            "Basic Python for data manipulation",
            "Ability to tell stories with data",
        ],
        "description": (
            "OYO operates 1M+ hotel rooms globally. Our Analytics team provides insights to operations, revenue, and marketing teams. "
            "As a Data Analyst, you'll build dashboards, analyse booking patterns, and help define KPIs for our hotel partners.\n\n"
            "Great role for someone who wants to work with large datasets and have a real impact on business decisions."
        ),
    },
    {
        "title": "Cloud Architect",
        "company": "Infosys",
        "location": "Pune",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "lead",
        "salary_min": 3500000,
        "salary_max": 6000000,
        "skills_required": ["AWS", "Azure", "Terraform", "Kubernetes", "Microservices", "Security", "Python"],
        "requirements": [
            "8+ years in cloud/infrastructure roles",
            "AWS Solutions Architect Professional or equivalent",
            "Multi-cloud (AWS + Azure) architecture experience",
            "Terraform and IaC best practices",
            "Experience with enterprise security and compliance",
        ],
        "description": (
            "Infosys Consulting is hiring a Cloud Architect to lead digital transformation projects for Fortune 500 clients. "
            "You'll design cloud migration strategies, define reference architectures, and guide implementation teams.\n\n"
            "This role involves client-facing consulting, so strong communication skills are essential."
        ),
    },
    {
        "title": "iOS Developer (Swift)",
        "company": "Zomato",
        "location": "Gurugram",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 1600000,
        "salary_max": 2800000,
        "skills_required": ["Swift", "iOS", "UIKit", "SwiftUI", "Xcode", "REST API", "Git"],
        "requirements": [
            "3+ years iOS development experience",
            "Strong Swift and UIKit knowledge",
            "SwiftUI experience preferred",
            "App Store submission experience",
            "Performance profiling and optimisation skills",
        ],
        "description": (
            "Zomato serves 20M+ active food delivery users. Our iOS team builds the consumer app used daily across India. "
            "As an iOS Developer, you'll own features from the live tracking map to restaurant discovery and payments.\n\n"
            "We value engineers who care about app quality, performance, and great user experiences."
        ),
    },
    {
        "title": "Security Engineer",
        "company": "Razorpay",
        "location": "Bangalore",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 2000000,
        "salary_max": 3500000,
        "skills_required": ["Security", "Python", "AWS", "Penetration Testing", "OWASP", "Kubernetes", "CI/CD"],
        "requirements": [
            "3+ years in application or infrastructure security",
            "Experience with penetration testing and vulnerability assessment",
            "OWASP Top 10 and secure coding practices",
            "Cloud security (AWS) experience",
            "Scripting in Python for security automation",
        ],
        "description": (
            "Razorpay processes billions in payments — security is our highest priority. Our Security Engineering team "
            "builds tooling to detect and prevent threats, runs penetration tests, and works with product teams to design secure systems.\n\n"
            "You'll be embedded with engineering teams to review architectures, define security standards, and respond to incidents."
        ),
    },
    {
        "title": "Software Engineer - Platform",
        "company": "Atlassian",
        "location": "Bangalore",
        "remote_type": "remote",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 2800000,
        "salary_max": 5000000,
        "skills_required": ["Java", "Python", "Microservices", "AWS", "Kafka", "PostgreSQL", "REST API"],
        "requirements": [
            "3+ years software engineering experience",
            "Strong Java or Python backend skills",
            "Experience with distributed systems",
            "AWS services knowledge",
            "Experience with agile development practices",
        ],
        "description": (
            "Atlassian builds tools that help teams work better — Jira, Confluence, Trello, and more are used by 10M+ teams. "
            "Our Platform Engineering team builds the infrastructure powering these products globally.\n\n"
            "This is a fully remote role. You'll work with a distributed team across India, Australia, and the US."
        ),
    },
    {
        "title": "Backend Engineer (Node.js)",
        "company": "ShareChat",
        "location": "Bangalore",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 1600000,
        "salary_max": 2800000,
        "skills_required": ["Node.js", "TypeScript", "MongoDB", "Redis", "Kafka", "AWS", "Docker"],
        "requirements": [
            "3+ years Node.js backend development",
            "Strong TypeScript skills",
            "MongoDB and Redis experience",
            "Experience with event-driven architectures",
            "AWS deployment experience",
        ],
        "description": (
            "ShareChat is India's largest regional language social media platform with 200M+ monthly active users. "
            "Our backend team builds content delivery, user engagement, and creator monetisation systems.\n\n"
            "Stack: Node.js (TypeScript), MongoDB, Redis, Kafka, AWS."
        ),
    },
    {
        "title": "ML Platform Engineer",
        "company": "Ola",
        "location": "Bangalore",
        "remote_type": "onsite",
        "job_type": "full_time",
        "experience_level": "senior",
        "salary_min": 2500000,
        "salary_max": 4500000,
        "skills_required": ["Python", "MLflow", "Airflow", "Kubernetes", "Spark", "Feature Store", "Docker"],
        "requirements": [
            "5+ years in ML engineering or platform roles",
            "Experience building ML platforms (feature stores, model registries)",
            "Airflow and MLflow proficiency",
            "Strong Kubernetes and containerisation skills",
            "Experience with Spark for large-scale feature computation",
        ],
        "description": (
            "Ola's ML team builds the brains behind ride-matching, pricing, and driver management. "
            "As an ML Platform Engineer, you'll build the infrastructure that data scientists use to train, evaluate, and deploy models.\n\n"
            "You'll own the feature store, model serving platform, and experiment tracking systems."
        ),
    },
    {
        "title": "Engineering Manager",
        "company": "Freshworks",
        "location": "Chennai",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "lead",
        "salary_min": 4000000,
        "salary_max": 7000000,
        "skills_required": ["Engineering Management", "Python", "Ruby", "PostgreSQL", "AWS", "Agile", "System Design"],
        "requirements": [
            "7+ years software engineering, 2+ years as EM",
            "Experience managing teams of 6-10 engineers",
            "Strong technical background in backend systems",
            "Excellent communication and stakeholder management",
            "Track record of shipping products on time",
        ],
        "description": (
            "Freshworks builds SaaS CRM and customer support software used by 60,000+ businesses globally. "
            "We're hiring an Engineering Manager to lead a team building our customer engagement platform.\n\n"
            "You'll own hiring, career development, technical direction, and delivery for your team. "
            "Strong technical depth is required — you'll review architecture, resolve blockers, and stay close to the code."
        ),
    },
    {
        "title": "Python Developer (AI/ML)",
        "company": "TCS",
        "location": "Hyderabad",
        "remote_type": "hybrid",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 1000000,
        "salary_max": 1800000,
        "skills_required": ["Python", "FastAPI", "PostgreSQL", "Docker", "REST API", "Git", "Agile"],
        "requirements": [
            "2-5 years Python development experience",
            "FastAPI or Flask backend development",
            "PostgreSQL and ORM experience",
            "Docker and containerisation basics",
            "Good understanding of REST API design",
        ],
        "description": (
            "TCS is hiring Python Developers for its AI/ML delivery unit, working on enterprise automation and data platform projects "
            "for Fortune 500 clients. You'll build REST APIs, data pipelines, and ML model integration services.\n\n"
            "This role is part of TCS's fast-growing AI delivery practice with opportunities for upskilling and certification."
        ),
    },
    {
        "title": "Staff Engineer - Infrastructure",
        "company": "Dunzo",
        "location": "Bangalore",
        "remote_type": "onsite",
        "job_type": "full_time",
        "experience_level": "lead",
        "salary_min": 4500000,
        "salary_max": 8000000,
        "skills_required": ["Go", "Python", "Kubernetes", "AWS", "Terraform", "gRPC", "PostgreSQL", "Kafka"],
        "requirements": [
            "8+ years in software/infrastructure engineering",
            "Deep distributed systems experience",
            "Go or Rust proficiency",
            "History of defining architecture across org-wide systems",
            "Strong mentorship and technical leadership track record",
        ],
        "description": (
            "Dunzo is a quick commerce company delivering in under 19 minutes. Our infrastructure team is the backbone "
            "of real-time order orchestration, inventory management, and delivery routing.\n\n"
            "As a Staff Engineer, you'll define the technical direction for infrastructure, drive cross-team alignment, "
            "and mentor senior engineers. This is a high-autonomy role with significant impact."
        ),
    },
]
