import { useParams, useSearchParams } from 'react-router-dom';
import { useActivityTheme } from '../hooks/useActivityTheme';
import RegistrationForm from '../components/RegistrationForm';

export default function RegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const accessCode = searchParams.get('code');

  const { theme, subActivities, customerManagers, loading, error: loadError, closed } =
    useActivityTheme(slug || '', accessCode);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (loadError) {
    return (
      <div className="card result-card">
        <div className="icon">!</div>
        <h2>{loadError}</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
          请确认链接是否正确
        </p>
      </div>
    );
  }

  if (closed || !theme) {
    return (
      <div className="card result-card">
        <div className="icon">!</div>
        <h2>报名已截止</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
          该活动已停止报名，如有疑问请联系活动负责人
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="theme-info">
        <h1>{theme.title}</h1>
        <span className="date">
          {new Date(theme.event_date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>

      <RegistrationForm
        themeId={theme.id}
        themeTitle={theme.title}
        subActivities={subActivities}
        customerManagers={customerManagers}
      />
    </div>
  );
}
