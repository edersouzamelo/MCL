import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    "/inicio",
    "/painel",
    "/necessidades/:path*",
    "/analises/:path*",
    "/aquisicoes/:path*",
    "/scanner/:path*",
    "/conectores/:path*",
    "/divergencias/:path*",
    "/importacao/:path*",
    "/auditoria/:path*",
    "/primeiro-acesso",
  ],
};
