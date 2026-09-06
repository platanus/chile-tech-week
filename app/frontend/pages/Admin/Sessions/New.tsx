import { Form, Head, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { root_path, user_session_path } from '@/routes';

// /admin/login — the one form of the admin that renders outside its shell.
export default function New() {
  const { flash } = usePage().props;

  return (
    <div className="site flex min-h-screen items-center justify-center px-6">
      <Head>
        <title>Entrar · Admin · Chile Tech Week 2026</title>
      </Head>
      <div className="w-full max-w-sm">
        <a href={root_path()} className="font-display text-[15px] font-extrabold tracking-[-0.02em]">
          CLTW<b className="text-primary">26</b>
        </a>
        <h1 className="mt-6 font-display text-2xl font-extrabold uppercase tracking-[-0.03em]">Entrar</h1>
        <p className="mt-2 text-sm text-muted-foreground">El panel de moderación de Chile Tech Week.</p>

        {flash.alert && <p className="mt-4 rounded-sm border border-primary px-3 py-2 text-sm">{flash.alert}</p>}
        {flash.notice && <p className="mt-4 rounded-sm border border-border px-3 py-2 text-sm">{flash.notice}</p>}

        <Form action={user_session_path()} method="post" className="mt-8 flex flex-col gap-5">
          {({ errors, processing }) => (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="user[email]" type="email" autoComplete="email" required autoFocus />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" name="user[password]" type="password" autoComplete="current-password" required />
                {errors.password && <p className="text-sm text-primary">{errors.password}</p>}
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" name="user[remember_me]" value="1" className="size-4 accent-primary" />
                Recordarme
              </label>
              <Button type="submit" disabled={processing} className="font-display text-[11px] font-extrabold uppercase tracking-[.04em]">
                {processing ? 'Entrando…' : 'Entrar'}
              </Button>
            </>
          )}
        </Form>
      </div>
    </div>
  );
}
