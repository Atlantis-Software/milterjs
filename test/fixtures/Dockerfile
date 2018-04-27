FROM debian
RUN export DEBIAN_FRONTEND=noninteractive
RUN apt-get update
RUN  apt-get install -y postfix
COPY ./postfix_main.cf /etc/postfix/main.cf
COPY ./postfix_master.cf /etc/postfix/master.cf
RUN chmod 664 /etc/postfix/main.cf
RUN chmod 664 /etc/postfix/master.cf
EXPOSE 2525
CMD service postfix start; sleep infinity
