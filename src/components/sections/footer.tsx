import Link from "next/link";

export default function FooterData() {
  const currentYear = 2025;

  const companyLinks = [
    { name: "Blog", href: "/blog" },
    { name: "Careers", href: "/careers" },
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Data Terms of Service", href: "/data-terms" },
    { name: "Brand Kit", href: "/brand-kit" },
  ];

  const socialLinks = [
    { name: "X (Twitter)", href: "https://twitter.com/kalshi" },
    { name: "LinkedIn", href: "https://linkedin.com/company/kalshi" },
    { name: "Discord", href: "https://discord.gg/kalshi" },
    { name: "Facebook", href: "https://facebook.com/kalshi" },
    { name: "Instagram", href: "https://instagram.com/kalshi" },
    { name: "Reddit", href: "https://reddit.com/r/kalshi" },
    { name: "TikTok", href: "https://tiktok.com/@kalshi" },
  ];

  const productLinks = [
    { name: "Help Center", href: "/help" },
    { name: "API", href: "/docs" },
    { name: "FAQ", href: "/faq" },
    { name: "FAQ for Finance Professionals", href: "/faq-finance" },
    { name: "Regulatory", href: "/regulatory" },
    { name: "Trading Hours", href: "/trading-hours" },
    { name: "Fee Schedule", href: "/fees" },
    { name: "Trading Prohibitions", href: "/trading-prohibitions" },
    { name: "Incentive Program", href: "/incentive-program" },
  ];

  return (
    <footer className="w-full bg-[#F5F5F5] border-t border-[#E0E0E0] font-sans antialiased">
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        {/* Top Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Company Column */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-[#1A1A1A] text-[14px] font-bold tracking-tight">
              Company
            </h3>
            <ul className="flex flex-col space-y-3">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[#666666] text-[14px] hover:text-[#00D991] transition-colors duration-200 block w-fit"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Column */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-[#1A1A1A] text-[14px] font-bold tracking-tight">
              Social
            </h3>
            <ul className="flex flex-col space-y-3">
              {socialLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#666666] text-[14px] hover:text-[#00D991] transition-colors duration-200 block w-fit"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Product Column */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-[#1A1A1A] text-[14px] font-bold tracking-tight">
              Product
            </h3>
            <ul className="flex flex-col space-y-3">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[#666666] text-[14px] hover:text-[#00D991] transition-colors duration-200 block w-fit"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[#E0E0E0] mb-8" />

        {/* Bottom Section */}
        <div className="flex flex-col space-y-4">
          <p className="text-[#1A1A1A] text-[13px] font-normal">
            &copy; {currentYear} Kalshi Inc.
          </p>
          <p className="text-[#999999] text-[11px] leading-[1.6]">
            Trading on Kalshi involves risk and may not be appropriate for all.
            Members risk losing their cost to enter any transaction, including
            fees. You should carefully consider whether trading on Kalshi is
            appropriate for you in light of your investment experience and
            financial resources. Any trading decisions you make are solely your
            responsibility and at your own risk. Information is provided for
            convenience only on an &quot;AS IS&quot; basis. Past performance is
            not necessarily indicative of future results. Kalshi is subject to
            U.S. regulatory oversight by the CFTC.
          </p>
        </div>
      </div>
    </footer>
  );
}