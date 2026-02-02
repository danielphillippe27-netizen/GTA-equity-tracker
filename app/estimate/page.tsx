import { redirect } from 'next/navigation';

// Redirect /estimate to the landing page since the form is now there
export default function EstimatePage() {
  redirect('/');
}
