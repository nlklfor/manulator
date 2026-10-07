type AuthHeadingProps = {
  title: string;
  description: string;
};

export default function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{title}</h1>
      <p className="mt-1 text-sm leading-5 text-mt-text-muted">{description}</p>
    </div>
  );
}
