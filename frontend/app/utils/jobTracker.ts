/**
 * Global job tracker for background TCOE report generation
 * Tracks jobs across page navigation
 */

interface JobStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at?: string;
  completed_at?: string;
  result?: any;
  error?: string;
}

class JobTracker {
  private jobs: Map<string, JobStatus> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: Map<string, (status: JobStatus) => void> = new Map();

  /**
   * Start tracking a background job
   */
  startJob(jobId: string, onComplete: (status: JobStatus) => void) {
    // Store callback
    this.callbacks.set(jobId, onComplete);
    
    // Load from localStorage if exists
    const stored = localStorage.getItem(`tcoe_job_${jobId}`);
    if (stored) {
      try {
        const jobStatus = JSON.parse(stored);
        this.jobs.set(jobId, jobStatus);
        
        // If already completed, call callback immediately
        if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
          onComplete(jobStatus);
          return;
        }
      } catch (e) {
        console.error('Error loading stored job:', e);
      }
    }
    
    // Start polling
    this.pollJobStatus(jobId);
  }

  /**
   * Poll for job status
   */
  private async pollJobStatus(jobId: string) {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
    
    const poll = async () => {
      try {
        const response = await fetch(`${apiBase}/api/quality/tcoe-job-status/${jobId}`);
        if (!response.ok) {
          console.error(`Failed to check job status for ${jobId}`);
          return;
        }
        
        const data = await response.json();
        if (data.success) {
          const status: JobStatus = {
            job_id: data.job_id,
            status: data.status,
            created_at: data.created_at,
            completed_at: data.completed_at,
            result: data.result,
            error: data.error
          };
          
          // Update stored status
          this.jobs.set(jobId, status);
          localStorage.setItem(`tcoe_job_${jobId}`, JSON.stringify(status));
          
          // Call callback
          const callback = this.callbacks.get(jobId);
          if (callback) {
            callback(status);
          }
          
          // Stop polling if completed or failed
          if (status.status === 'completed' || status.status === 'failed') {
            this.stopPolling(jobId);
            // Clean up after 1 hour
            setTimeout(() => {
              localStorage.removeItem(`tcoe_job_${jobId}`);
              this.jobs.delete(jobId);
              this.callbacks.delete(jobId);
            }, 3600000); // 1 hour
          }
        }
      } catch (error) {
        console.error(`Error polling job ${jobId}:`, error);
      }
    };
    
    // Poll immediately, then every 2 seconds
    poll();
    const interval = setInterval(poll, 2000);
    this.pollingIntervals.set(jobId, interval);
  }

  /**
   * Stop polling for a job
   */
  stopPolling(jobId: string) {
    const interval = this.pollingIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(jobId);
    }
  }

  /**
   * Get current job status
   */
  getJobStatus(jobId: string): JobStatus | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Check for any pending jobs on app load
   */
  checkPendingJobs(onJobComplete: (jobId: string, status: JobStatus) => void) {
    // Check localStorage for any pending jobs
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tcoe_job_')) {
        try {
          const jobStatus = JSON.parse(localStorage.getItem(key) || '{}');
          if (jobStatus.status === 'pending' || jobStatus.status === 'processing') {
            const jobId = key.replace('tcoe_job_', '');
            this.startJob(jobId, (status) => {
              onJobComplete(jobId, status);
            });
          }
        } catch (e) {
          console.error('Error checking pending job:', e);
        }
      }
    }
  }
}

// Singleton instance
export const jobTracker = new JobTracker();

// Check for pending jobs on module load (runs once)
if (typeof window !== 'undefined') {
  // This will be called when the module is loaded
  // The actual checking will be done by components that use it
}

