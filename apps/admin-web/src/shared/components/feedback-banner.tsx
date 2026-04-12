type FeedbackBannerProps = {
  kind: "success" | "info";
  message: string;
};

export function FeedbackBanner({ kind, message }: FeedbackBannerProps) {
  return (
    <section className={`feedback-banner feedback-banner--${kind}`}>
      <p>{message}</p>
    </section>
  );
}
