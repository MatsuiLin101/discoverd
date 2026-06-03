import Link from "next/link";
import Image from "next/image";

export interface CategoryItem {
  href: string;
  name: string;
  count: string | number;
  img: string;
}

interface Props {
  title: string;
  stats: string[];
  categories: CategoryItem[];
}

const ArrowSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function CategoryList({ title, stats, categories }: Props) {
  return (
    <section className="fh-cats">
      <div className="fh-sec-head">
        <div className="mid">
          <h2
            className="t"
            dangerouslySetInnerHTML={{ __html: title }}
          />
        </div>
        <div className="r">
          {stats.map((s, i) => (
            <span key={i} dangerouslySetInnerHTML={{ __html: s }} />
          ))}
        </div>
      </div>

      <div className="fh-cat-list">
        {categories.map((cat) => (
          <Link key={cat.href} className="fh-cat-row" href={cat.href}>
            <div className="cat-txt">
              <span className="cat-nm">{cat.name}</span>
              <span className="cat-ct">{cat.count} 條路線</span>
            </div>
            <div className="cat-thumb">
              {cat.img ? (
                <Image
                  src={cat.img}
                  alt={cat.name}
                  fill
                  sizes="240px"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "var(--line)" }} />
              )}
            </div>
            <span className="cat-arrow">
              <ArrowSvg />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
