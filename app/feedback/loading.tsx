import AppShellLoading from '@/app/components/layout/AppShellLoading';
import { ProfileContentSkeleton } from '@/app/components/layout/PageSkeleton';

export default function FeedbackLoading() {
  return (
    <AppShellLoading title="Feedbacks de melhorias">
      <ProfileContentSkeleton />
    </AppShellLoading>
  );
}
