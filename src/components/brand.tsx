import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      aria-label="VENUMAIS — página inicial"
      className={`brand${inverse ? " brand-inverse" : ""}`}
      href="/"
    >
      <span aria-hidden="true" className="brand-mark">
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M5 7.5 12 18l7-10.5M8.2 7.5 12 13l3.8-5.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
        </svg>
      </span>
      VENUMAIS
    </Link>
  );
}
