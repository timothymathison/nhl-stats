FROM node:19-alpine as build

RUN apk add yarn

COPY package.json .
COPY yarn.lock .
COPY .yarnrc.yml .

RUN yarn

COPY db db
RUN yarn prisma:setup

ENTRYPOINT [ "yarn" ]

FROM build as db-migrate

CMD ["db:migrate"]

FROM build as app

COPY lib lib
COPY *.js .

CMD ["start"]
