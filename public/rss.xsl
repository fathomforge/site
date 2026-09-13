<?xml version="1.0" encoding="UTF-8"?>
<!--
  Makes /rss.xml readable when a human opens it in a browser, while leaving the
  feed itself a perfectly ordinary RSS 2.0 document for feed readers.
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns="http://www.w3.org/1999/xhtml">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="/rss/channel/title"/> — feed</title>
        <link rel="stylesheet" href="/rss-style.css"/>
      </head>
      <body>
        <main class="wrap">
          <p class="kicker">RSS feed</p>
          <h1><xsl:value-of select="/rss/channel/title"/></h1>
          <p class="lede"><xsl:value-of select="/rss/channel/description"/></p>

          <div class="note">
            <p>
              This is a feed, meant for a feed reader. Copy this page's address into
              yours to get new posts automatically.
            </p>
            <p class="back">
              <a href="/">&#8592; back to fathomforge.dev</a>
            </p>
          </div>

          <xsl:choose>
            <xsl:when test="/rss/channel/item">
              <ol class="items">
                <xsl:for-each select="/rss/channel/item">
                  <li>
                    <a class="item" href="{link}">
                      <span class="date"><xsl:value-of select="substring(pubDate,1,16)"/></span>
                      <span class="title"><xsl:value-of select="title"/></span>
                      <span class="desc"><xsl:value-of select="description"/></span>
                    </a>
                  </li>
                </xsl:for-each>
              </ol>
            </xsl:when>
            <xsl:otherwise>
              <p class="empty">No posts published yet.</p>
            </xsl:otherwise>
          </xsl:choose>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
