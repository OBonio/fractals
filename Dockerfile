FROM --platform=linux/armhf nginx
#RUN rm /etc/nginx/conf.d/default.conf
#RUN rm /etc/nginx/conf.d/examplessl.conf
COPY content /usr/share/nginx/html
