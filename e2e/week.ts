import { execSync } from 'node:child_process';

// Every /admin URL carries the two digits of the Tech Week it is about; the panel opens on
// Week.current, which is also the week db/seeds.rb fills with a sample programme.
export const WEEK = execSync("bin/rails runner 'print Week.current.slug'", { encoding: 'utf8' }).trim();

export const adminPath = (rest: string) => `/admin/${WEEK}${rest}`;
