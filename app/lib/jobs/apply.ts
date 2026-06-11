import { withRlsUserContext } from '@/app/lib/rls';

type RegisterJobApplicationInput = {
  userId: string;
  jobId: string;
};

export type RegisterJobApplicationResult =
  | {
      status: 'applied';
      appliedAt: string;
      jobTitle: string;
      companyName: string;
    }
  | {
      status: 'already_applied';
      appliedAt: string;
      jobTitle: string;
      companyName: string;
    }
  | {
      status: 'not_found';
    }
  | {
      status: 'inactive';
    };

export async function registerJobApplication({ userId, jobId }: RegisterJobApplicationInput): Promise<RegisterJobApplicationResult> {
  return withRlsUserContext(userId, async (transaction) => {
    const job = await transaction.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        companyName: true,
        isActive: true,
      },
    });

    if (!job) {
      return { status: 'not_found' };
    }

    if (!job.isActive) {
      return { status: 'inactive' };
    }

    const existingApplication = await transaction.jobApplication.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
      select: {
        createdAt: true,
      },
    });

    if (existingApplication) {
      return {
        status: 'already_applied',
        appliedAt: existingApplication.createdAt.toISOString(),
        jobTitle: job.title,
        companyName: job.companyName,
      };
    }

    const createdApplication = await transaction.jobApplication.create({
      data: {
        userId,
        jobId,
      },
      select: {
        createdAt: true,
      },
    });

    return {
      status: 'applied',
      appliedAt: createdApplication.createdAt.toISOString(),
      jobTitle: job.title,
      companyName: job.companyName,
    };
  });
}
