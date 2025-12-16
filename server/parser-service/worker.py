from celery_app import app

if __name__ == '__main__':
    app.worker_main([
        'worker',
        '--loglevel=info',
        '--concurrency=4',
        '--max-tasks-per-child=100'
    ])
